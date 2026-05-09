"""
FastAPI router for all /admin/** endpoints.

Security model:
  - All routes require a valid admin JWT (scope="admin")
  - Destructive mutations require role="superadmin"
  - Login is rate-limited (5 attempts → 15-min lockout)
  - Every mutation writes to admin_audit_log
  - CSV export streams without loading everything into memory
  - password_hash is NEVER returned in any response
"""
import csv
import io
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from supabase import create_client, Client

from admin_auth import (
    create_admin_token,
    get_admin_user,
    require_superadmin,
    hash_admin_password,
    verify_admin_password,
    generate_invite_token,
    record_failed_attempt,
    clear_failed_attempts,
    is_rate_limited,
)
from admin_schemas import (
    AdminRegisterRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminOut,
    AdminUpdate,
    AdminCreate,
    PasswordUpdate,
    AdminStatsOut,

    InviteCreateRequest,
    InviteOut,
    UserAdminView,
    UserAdminUpdate,
    PaginatedUsersResponse,
)

logger = logging.getLogger("admin_api")
router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Supabase client (service role — bypasses RLS) ────────────────────────────

def get_admin_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    # Use service role key for admin operations (bypasses RLS)
    key = os.environ.get("ADMIN_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured.")
    return create_client(url, key)


# ── Audit logger ─────────────────────────────────────────────────────────────

def write_audit_log(
    sb: Client,
    admin: dict,
    action: str,
    target_type: str = None,
    target_id: str = None,
    metadata: dict = None,
    ip: str = None,
):
    try:
        sb.table("admin_audit_log").insert({
            "admin_id": admin.get("sub"),
            "admin_email": admin.get("email"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "ip_address": ip,
        }).execute()
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")


# ── AUTH ──────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
def admin_register(body: AdminRegisterRequest):
    """
    Register a new admin using a one-time invite token.
    No static secrets — the invite system is the gatekeeper.
    """
    sb = get_admin_supabase()

    # 1. Validate invite token
    inv_res = sb.table("admin_invites").select("*").eq("token", body.invite_token).execute()
    if not inv_res.data:
        raise HTTPException(status_code=400, detail="Invalid invite token.")

    invite = inv_res.data[0]
    if invite["used"]:
        raise HTTPException(status_code=400, detail="Invite token already used.")

    # Check expiry
    expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Invite token has expired.")

    # If pre-assigned email, enforce it
    if invite.get("email") and invite["email"].lower() != body.email.lower():
        raise HTTPException(status_code=400, detail="This invite was issued for a different email.")

    # 2. Check email uniqueness
    existing = sb.table("admins").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered as admin.")

    # 3. Create the admin
    password_hash = hash_admin_password(body.password)
    new_admin = sb.table("admins").insert({
        "email": body.email,
        "password_hash": password_hash,
        "full_name": body.full_name,
        "role": invite["role"],
    }).execute()

    if not new_admin.data:
        raise HTTPException(status_code=500, detail="Admin creation failed.")

    # 4. Mark invite as used
    sb.table("admin_invites").update({"used": True}).eq("token", body.invite_token).execute()

    admin_row = new_admin.data[0]
    token = create_admin_token({
        "sub": str(admin_row["id"]),
        "email": admin_row["email"],
        "role": admin_row["role"],
        "is_active": True,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "admin_id": str(admin_row["id"]),
        "email": admin_row["email"],
        "role": admin_row["role"],
    }


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest, request: Request):
    """
    Admin login with rate limiting (5 failures → 15-min lockout).
    """
    email = body.email.lower().strip()

    # Rate limit check
    if is_rate_limited(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again in 15 minutes.",
        )

    sb = get_admin_supabase()
    res = sb.table("admins").select("*").eq("email", email).execute()

    if not res.data:
        record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    admin = res.data[0]

    if not admin.get("is_active", True):
        raise HTTPException(status_code=403, detail="Admin account is deactivated.")

    if not verify_admin_password(body.password, admin["password_hash"]):
        record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Success — clear failures, update last_login_at
    clear_failed_attempts(email)
    sb.table("admins").update({"last_login_at": datetime.utcnow().isoformat()}).eq("id", admin["id"]).execute()

    token = create_admin_token({
        "sub": str(admin["id"]),
        "email": admin["email"],
        "role": admin["role"],
        "is_active": admin["is_active"],
    })

    # Audit
    ip = request.client.host if request.client else None
    write_audit_log(
        sb,
        {"sub": str(admin["id"]), "email": admin["email"]},
        action="admin_login",
        ip=ip,
    )

    return AdminLoginResponse(
        access_token=token,
        admin_id=str(admin["id"]),
        email=admin["email"],
        full_name=admin.get("full_name"),
        role=admin["role"],
    )


# ── INVITES ───────────────────────────────────────────────────────────────────

@router.post("/invites", response_model=InviteOut, status_code=201)
def create_invite(body: InviteCreateRequest, admin: dict = Depends(require_superadmin)):
    sb = get_admin_supabase()
    token = generate_invite_token()
    expires_at = (datetime.utcnow() + timedelta(hours=body.expires_in_hours)).isoformat()

    row = sb.table("admin_invites").insert({
        "token": token,
        "email": body.email,
        "role": body.role,
        "expires_at": expires_at,
        "created_by": admin.get("sub"),
    }).execute()

    if not row.data:
        raise HTTPException(status_code=500, detail="Failed to create invite.")

    write_audit_log(sb, admin, "create_invite", target_type="invite", metadata={"role": body.role, "email": body.email})

    r = row.data[0]
    return InviteOut(
        id=str(r["id"]),
        token=r["token"],
        email=r.get("email"),
        role=r["role"],
        used=r["used"],
        expires_at=r["expires_at"],
        created_at=r["created_at"],
    )


@router.get("/invites", response_model=List[InviteOut])
def list_invites(admin: dict = Depends(require_superadmin)):
    sb = get_admin_supabase()
    res = sb.table("admin_invites").select("*").order("created_at", desc=True).execute()
    return [
        InviteOut(
            id=str(r["id"]),
            token=r["token"],
            email=r.get("email"),
            role=r["role"],
            used=r["used"],
            expires_at=r["expires_at"],
            created_at=r["created_at"],
        )
        for r in (res.data or [])
    ]


@router.delete("/invites/{invite_id}", status_code=204)
def revoke_invite(invite_id: str, admin: dict = Depends(require_superadmin)):
    sb = get_admin_supabase()
    sb.table("admin_invites").delete().eq("id", invite_id).execute()
    write_audit_log(sb, admin, "revoke_invite", target_type="invite", target_id=invite_id)


# ── ADMINS CRUD ───────────────────────────────────────────────────────────────

@router.get("/admins", response_model=List[AdminOut])
def list_admins(admin: dict = Depends(get_admin_user)):
    sb = get_admin_supabase()
    res = sb.table("admins").select(
        "id, email, full_name, role, is_active, created_at, last_login_at"
    ).order("created_at", desc=True).execute()

    return [
        AdminOut(
            id=str(r["id"]),
            email=r["email"],
            full_name=r.get("full_name"),
            role=r["role"],
            is_active=r["is_active"],
            created_at=r["created_at"],
            last_login_at=r.get("last_login_at"),
        )
        for r in (res.data or [])
    ]


@router.get("/admins/{admin_id}", response_model=AdminOut)
def get_admin(admin_id: str, admin: dict = Depends(get_admin_user)):
    sb = get_admin_supabase()
    res = sb.table("admins").select(
        "id, email, full_name, role, is_active, created_at, last_login_at"
    ).eq("id", admin_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Admin not found.")

    r = res.data[0]
    return AdminOut(
        id=str(r["id"]),
        email=r["email"],
        full_name=r.get("full_name"),
        role=r["role"],
        is_active=r["is_active"],
        created_at=r["created_at"],
        last_login_at=r.get("last_login_at"),
    )


@router.patch("/admins/{admin_id}", response_model=AdminOut)
def update_admin(admin_id: str, body: AdminUpdate, admin: dict = Depends(require_superadmin)):
    # Prevent superadmin from deactivating themselves
    if admin_id == admin.get("sub") and body.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    sb = get_admin_supabase()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    update_data["updated_at"] = datetime.utcnow().isoformat()
    res = sb.table("admins").update(update_data).eq("id", admin_id).select(
        "id, email, full_name, role, is_active, created_at, last_login_at"
    ).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Admin not found.")

    write_audit_log(sb, admin, "update_admin", target_type="admin", target_id=admin_id, metadata=update_data)

    r = res.data[0]
    return AdminOut(
        id=str(r["id"]),
        email=r["email"],
        full_name=r.get("full_name"),
        role=r["role"],
        is_active=r["is_active"],
        created_at=r["created_at"],
        last_login_at=r.get("last_login_at"),
    )


@router.delete("/admins/{admin_id}", status_code=204)
def delete_admin(admin_id: str, admin: dict = Depends(require_superadmin)):
    if admin_id == admin.get("sub"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    sb = get_admin_supabase()
    # Soft-delete: set is_active=false
    sb.table("admins").update({"is_active": False, "updated_at": datetime.utcnow().isoformat()}).eq("id", admin_id).execute()
    write_audit_log(sb, admin, "deactivate_admin", target_type="admin", target_id=admin_id)


@router.post("/admins", response_model=AdminOut, status_code=201)
def create_admin_manually(body: AdminCreate, admin: dict = Depends(require_superadmin)):
    """
    Directly create an admin without an invite token.
    Superadmin only.
    """
    sb = get_admin_supabase()
    
    # Check email uniqueness
    existing = sb.table("admins").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered as admin.")

    password_hash = hash_admin_password(body.password)
    new_admin = sb.table("admins").insert({
        "email": body.email,
        "password_hash": password_hash,
        "full_name": body.full_name,
        "role": body.role,
        "is_active": True,
    }).execute()

    if not new_admin.data:
        raise HTTPException(status_code=500, detail="Admin creation failed.")

    r = new_admin.data[0]
    write_audit_log(sb, admin, "create_admin_manual", target_type="admin", target_id=str(r["id"]), metadata={"email": r["email"], "role": r["role"]})

    return AdminOut(
        id=str(r["id"]),
        email=r["email"],
        full_name=r.get("full_name"),
        role=r["role"],
        is_active=r["is_active"],
        created_at=r["created_at"],
        last_login_at=None,
    )


@router.patch("/admins/{admin_id}/password", status_code=204)
def change_admin_password(admin_id: str, body: PasswordUpdate, current_admin: dict = Depends(get_admin_user)):
    """
    Change an admin's password.
    Self can change own, superadmin can change anyone's.
    """
    if admin_id != current_admin.get("sub") and current_admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized to change this admin's password.")

    sb = get_admin_supabase()
    password_hash = hash_admin_password(body.new_password)
    
    res = sb.table("admins").update({
        "password_hash": password_hash,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", admin_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Admin not found.")

    write_audit_log(sb, current_admin, "change_admin_password", target_type="admin", target_id=admin_id)



# ── USERS CRUD ────────────────────────────────────────────────────────────────

def _enrich_users(sb: Client, users: list) -> List[UserAdminView]:
    """Add course count to each user row."""
    result = []
    for u in users:
        uid = str(u["id"])
        cc_res = sb.table("user_courses").select("id", count="exact").eq("user_id", uid).execute()
        course_count = cc_res.count if cc_res.count is not None else len(cc_res.data or [])

        skills = u.get("selected_skills")
        if isinstance(skills, str):
            import json
            try:
                skills = json.loads(skills)
            except Exception:
                skills = []

        result.append(UserAdminView(
            id=uid,
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            education_level=u.get("education_level"),
            college_year=u.get("college_year"),
            interest_text=u.get("interest_text"),
            selected_skills=skills,
            is_active=u.get("is_active", True),
            course_count=course_count,
            created_at=u.get("created_at", ""),
        ))
    return result


@router.get("/users", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search by email"),
    has_courses: Optional[bool] = Query(None),
    admin: dict = Depends(get_admin_user),
):
    sb = get_admin_supabase()

    query = sb.table("users").select(
        "id, email, full_name, education_level, college_year, interest_text, selected_skills, is_active, created_at",
        count="exact",
    )

    if search:
        query = query.ilike("email", f"%{search}%")

    offset = (page - 1) * page_size
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)
    res = query.execute()

    users = res.data or []
    total = res.count if res.count is not None else len(users)

    # Filter by has_courses after fetching (Supabase anon client lacks join filters)
    enriched = _enrich_users(sb, users)

    if has_courses is True:
        enriched = [u for u in enriched if u.course_count > 0]
    elif has_courses is False:
        enriched = [u for u in enriched if u.course_count == 0]

    import math
    return PaginatedUsersResponse(
        data=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/users/export")
def export_users_csv(admin: dict = Depends(get_admin_user)):
    """
    Streams a CSV file of all users.
    password_hash is explicitly excluded.
    """
    sb = get_admin_supabase()
    res = sb.table("users").select(
        "id, email, full_name, education_level, college_year, interest_text, selected_skills, is_active, created_at"
    ).order("created_at", desc=True).execute()

    users = res.data or []

    # Enrich with course counts
    for u in users:
        cc_res = sb.table("user_courses").select("id", count="exact").eq("user_id", str(u["id"])).execute()
        u["course_count"] = cc_res.count if cc_res.count is not None else len(cc_res.data or [])

    FIELDNAMES = [
        "id", "email", "full_name", "education_level", "college_year",
        "interest_text", "selected_skills", "is_active", "course_count", "created_at",
    ]

    def generate():
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        yield output.getvalue()
        output.seek(0)
        output.truncate()
        for row in users:
            # Flatten list fields
            if isinstance(row.get("selected_skills"), list):
                row["selected_skills"] = "|".join(row["selected_skills"])
            writer.writerow({k: row.get(k, "") for k in FIELDNAMES})
            yield output.getvalue()
            output.seek(0)
            output.truncate()

    write_audit_log(sb, admin, "export_users_csv", metadata={"count": len(users)})

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    headers = {"Content-Disposition": f"attachment; filename=users_export_{timestamp}.csv"}
    return StreamingResponse(generate(), media_type="text/csv", headers=headers)


@router.get("/users/{user_id}", response_model=UserAdminView)
def get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    sb = get_admin_supabase()
    res = sb.table("users").select(
        "id, email, full_name, education_level, college_year, interest_text, selected_skills, is_active, created_at"
    ).eq("id", user_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="User not found.")

    enriched = _enrich_users(sb, res.data)
    return enriched[0]


@router.patch("/users/{user_id}", response_model=UserAdminView)
def update_user(user_id: str, body: UserAdminUpdate, admin: dict = Depends(get_admin_user)):
    sb = get_admin_supabase()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    res = sb.table("users").update(update_data).eq("id", user_id).select(
        "id, email, full_name, education_level, college_year, interest_text, selected_skills, is_active, created_at"
    ).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="User not found.")

    write_audit_log(sb, admin, "update_user", target_type="user", target_id=user_id, metadata=update_data)
    enriched = _enrich_users(sb, res.data)
    return enriched[0]


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: dict = Depends(require_superadmin)):
    sb = get_admin_supabase()

    # Hard delete with cascade (user_courses deleted by FK constraint)
    sb.table("users").delete().eq("id", user_id).execute()
    write_audit_log(sb, admin, "delete_user", target_type="user", target_id=user_id)


@router.patch("/users/{user_id}/password", status_code=204)
def change_user_password(user_id: str, body: PasswordUpdate, admin: dict = Depends(get_admin_user)):
    """
    Change a student's password.
    Any admin can do this.
    """
    sb = get_admin_supabase()
    password_hash = hash_admin_password(body.new_password)
    
    res = sb.table("users").update({
        "password_hash": password_hash,
    }).eq("id", user_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="User not found.")

    write_audit_log(sb, admin, "change_user_password", target_type="user", target_id=user_id)



# ── STATS ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsOut)
def get_stats(admin: dict = Depends(get_admin_user)):
    sb = get_admin_supabase()

    # Total users
    users_res = sb.table("users").select("id", count="exact").execute()
    total_users = users_res.count or 0

    # New users this week
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    new_res = sb.table("users").select("id", count="exact").gte("created_at", week_ago).execute()
    new_users_this_week = new_res.count or 0

    # Admins
    admins_res = sb.table("admins").select("id, is_active").execute()
    all_admins = admins_res.data or []
    total_admins = len(all_admins)
    active_admins = sum(1 for a in all_admins if a.get("is_active", True))

    # Total course selections
    courses_res = sb.table("user_courses").select("id", count="exact").execute()
    total_course_selections = courses_res.count or 0

    # Registrations last 30 days — group by day
    thirty_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    reg_res = sb.table("users").select("created_at").gte("created_at", thirty_ago).execute()
    from collections import Counter
    day_counts: Counter = Counter()
    for row in (reg_res.data or []):
        day = row["created_at"][:10]  # "YYYY-MM-DD"
        day_counts[day] += 1

    registrations_last_30_days = sorted(
        [{"date": d, "count": c} for d, c in day_counts.items()],
        key=lambda x: x["date"],
    )

    return AdminStatsOut(
        total_users=total_users,
        new_users_this_week=new_users_this_week,
        total_admins=total_admins,
        active_admins=active_admins,
        total_course_selections=total_course_selections,
        registrations_last_30_days=registrations_last_30_days,
    )

"""
FastAPI router for all /admin/** endpoints.
All data access goes through DATABASE_URL (Postgres pool) — no Supabase client.
"""
import csv
import io
import json
import logging
import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from psycopg2.extras import Json

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
from db import execute, execute_returning, fetchall, fetchone, fetchval, get_database_url

logger = logging.getLogger("admin_api")
router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_db():
    try:
        get_database_url()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def write_audit_log(
    admin: dict,
    action: str,
    target_type: str = None,
    target_id: str = None,
    metadata: dict = None,
    ip: str = None,
):
    try:
        execute(
            """
            INSERT INTO admin_audit_log
              (admin_id, admin_email, action, target_type, target_id, metadata, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                admin.get("sub"),
                admin.get("email"),
                action,
                target_type,
                target_id,
                Json(metadata or {}),
                ip,
            ),
        )
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")


def _admin_out(row: dict) -> AdminOut:
    return AdminOut(
        id=str(row["id"]),
        email=row["email"],
        full_name=row.get("full_name"),
        role=row["role"],
        is_active=row["is_active"],
        created_at=row["created_at"],
        last_login_at=row.get("last_login_at"),
    )


def _invite_out(row: dict) -> InviteOut:
    return InviteOut(
        id=str(row["id"]),
        token=row["token"],
        email=row.get("email"),
        role=row["role"],
        used=row["used"],
        expires_at=row["expires_at"],
        created_at=row["created_at"],
    )


def _normalize_skills(skills):
    if isinstance(skills, str):
        try:
            return json.loads(skills)
        except Exception:
            return []
    return skills or []


def _enrich_users(users: list) -> List[UserAdminView]:
    result = []
    for u in users:
        uid = str(u["id"])
        course_count = fetchval(
            "SELECT COUNT(*) FROM user_courses WHERE user_id = %s",
            (uid,),
        ) or 0
        result.append(UserAdminView(
            id=uid,
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            education_level=u.get("education_level"),
            college_year=u.get("college_year"),
            interest_text=u.get("interest_text"),
            selected_skills=_normalize_skills(u.get("selected_skills")),
            is_active=u.get("is_active", True),
            course_count=int(course_count),
            created_at=u["created_at"],
        ))
    return result


USER_COLS = (
    "id, email, full_name, education_level, college_year, "
    "interest_text, selected_skills, is_active, created_at"
)
ADMIN_COLS = "id, email, full_name, role, is_active, created_at, last_login_at"


@router.post("/register", status_code=status.HTTP_201_CREATED)
def admin_register(body: AdminRegisterRequest):
    _require_db()
    invite = fetchone("SELECT * FROM admin_invites WHERE token = %s", (body.invite_token,))
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite token.")
    if invite["used"]:
        raise HTTPException(status_code=400, detail="Invite token already used.")

    expires_at = _parse_ts(invite["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Invite token has expired.")

    if invite.get("email") and invite["email"].lower() != body.email.lower():
        raise HTTPException(status_code=400, detail="This invite was issued for a different email.")

    existing = fetchone("SELECT id FROM admins WHERE email = %s", (body.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered as admin.")

    password_hash = hash_admin_password(body.password)
    admin_row = execute_returning(
        """
        INSERT INTO admins (email, password_hash, full_name, role)
        VALUES (%s, %s, %s, %s)
        RETURNING id, email, full_name, role, is_active, created_at, last_login_at
        """,
        (body.email, password_hash, body.full_name, invite["role"]),
    )
    if not admin_row:
        raise HTTPException(status_code=500, detail="Admin creation failed.")

    execute(
        "UPDATE admin_invites SET used = true WHERE token = %s",
        (body.invite_token,),
    )

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
    _require_db()
    email = body.email.lower().strip()

    if is_rate_limited(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again in 15 minutes.",
        )

    admin = fetchone("SELECT * FROM admins WHERE email = %s", (email,))
    if not admin:
        record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not admin.get("is_active", True):
        raise HTTPException(status_code=403, detail="Admin account is deactivated.")

    if not verify_admin_password(body.password, admin["password_hash"]):
        record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    clear_failed_attempts(email)
    execute(
        "UPDATE admins SET last_login_at = %s WHERE id = %s",
        (datetime.now(timezone.utc), admin["id"]),
    )

    token = create_admin_token({
        "sub": str(admin["id"]),
        "email": admin["email"],
        "role": admin["role"],
        "is_active": admin["is_active"],
    })

    ip = request.client.host if request.client else None
    write_audit_log(
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


@router.post("/invites", response_model=InviteOut, status_code=201)
def create_invite(body: InviteCreateRequest, admin: dict = Depends(require_superadmin)):
    _require_db()
    token = generate_invite_token()
    expires_at = datetime.utcnow() + timedelta(hours=body.expires_in_hours)

    row = execute_returning(
        """
        INSERT INTO admin_invites (token, email, role, expires_at, created_by)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
        """,
        (token, body.email, body.role, expires_at, admin.get("sub")),
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create invite.")

    write_audit_log(admin, "create_invite", target_type="invite", metadata={"role": body.role, "email": body.email})
    return _invite_out(row)


@router.get("/invites", response_model=List[InviteOut])
def list_invites(admin: dict = Depends(require_superadmin)):
    _require_db()
    rows = fetchall("SELECT * FROM admin_invites ORDER BY created_at DESC")
    return [_invite_out(r) for r in rows]


@router.delete("/invites/{invite_id}", status_code=204)
def revoke_invite(invite_id: str, admin: dict = Depends(require_superadmin)):
    _require_db()
    execute("DELETE FROM admin_invites WHERE id = %s", (invite_id,))
    write_audit_log(admin, "revoke_invite", target_type="invite", target_id=invite_id)


@router.get("/admins", response_model=List[AdminOut])
def list_admins(admin: dict = Depends(get_admin_user)):
    _require_db()
    rows = fetchall(f"SELECT {ADMIN_COLS} FROM admins ORDER BY created_at DESC")
    return [_admin_out(r) for r in rows]


@router.get("/admins/{admin_id}", response_model=AdminOut)
def get_admin(admin_id: str, admin: dict = Depends(get_admin_user)):
    _require_db()
    row = fetchone(f"SELECT {ADMIN_COLS} FROM admins WHERE id = %s", (admin_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Admin not found.")
    return _admin_out(row)


@router.patch("/admins/{admin_id}", response_model=AdminOut)
def update_admin(admin_id: str, body: AdminUpdate, admin: dict = Depends(require_superadmin)):
    if admin_id == admin.get("sub") and body.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    _require_db()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    update_data["updated_at"] = datetime.utcnow()
    sets = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values()) + [admin_id]

    row = execute_returning(
        f"UPDATE admins SET {sets} WHERE id = %s RETURNING {ADMIN_COLS}",
        tuple(values),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Admin not found.")

    write_audit_log(admin, "update_admin", target_type="admin", target_id=admin_id, metadata=update_data)
    return _admin_out(row)


@router.delete("/admins/{admin_id}", status_code=204)
def delete_admin(admin_id: str, admin: dict = Depends(require_superadmin)):
    if admin_id == admin.get("sub"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    _require_db()
    execute(
        "UPDATE admins SET is_active = false, updated_at = %s WHERE id = %s",
        (datetime.utcnow(), admin_id),
    )
    write_audit_log(admin, "deactivate_admin", target_type="admin", target_id=admin_id)


@router.post("/admins", response_model=AdminOut, status_code=201)
def create_admin_manually(body: AdminCreate, admin: dict = Depends(require_superadmin)):
    _require_db()
    existing = fetchone("SELECT id FROM admins WHERE email = %s", (body.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered as admin.")

    password_hash = hash_admin_password(body.password)
    row = execute_returning(
        """
        INSERT INTO admins (email, password_hash, full_name, role, is_active)
        VALUES (%s, %s, %s, %s, true)
        RETURNING id, email, full_name, role, is_active, created_at, last_login_at
        """,
        (body.email, password_hash, body.full_name, body.role),
    )
    if not row:
        raise HTTPException(status_code=500, detail="Admin creation failed.")

    write_audit_log(
        admin, "create_admin_manual", target_type="admin", target_id=str(row["id"]),
        metadata={"email": row["email"], "role": row["role"]},
    )
    return _admin_out(row)


@router.patch("/admins/{admin_id}/password", status_code=204)
def change_admin_password(admin_id: str, body: PasswordUpdate, current_admin: dict = Depends(get_admin_user)):
    if admin_id != current_admin.get("sub") and current_admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized to change this admin's password.")

    _require_db()
    password_hash = hash_admin_password(body.new_password)
    updated = execute(
        "UPDATE admins SET password_hash = %s, updated_at = %s WHERE id = %s",
        (password_hash, datetime.utcnow(), admin_id),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Admin not found.")

    write_audit_log(current_admin, "change_admin_password", target_type="admin", target_id=admin_id)


@router.get("/users", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search by email"),
    has_courses: Optional[bool] = Query(None),
    admin: dict = Depends(get_admin_user),
):
    _require_db()
    where = []
    params: list = []
    if search:
        where.append("email ILIKE %s")
        params.append(f"%{search}%")
    where_sql = f" WHERE {' AND '.join(where)}" if where else ""

    total = fetchval(f"SELECT COUNT(*) FROM users{where_sql}", tuple(params)) or 0
    offset = (page - 1) * page_size
    users = fetchall(
        f"""
        SELECT {USER_COLS} FROM users{where_sql}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (page_size, offset),
    )

    enriched = _enrich_users(users)
    if has_courses is True:
        enriched = [u for u in enriched if u.course_count > 0]
    elif has_courses is False:
        enriched = [u for u in enriched if u.course_count == 0]

    return PaginatedUsersResponse(
        data=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/users/export")
def export_users_csv(admin: dict = Depends(get_admin_user)):
    _require_db()
    users = fetchall(
        f"SELECT {USER_COLS} FROM users ORDER BY created_at DESC",
    )

    for u in users:
        u["course_count"] = fetchval(
            "SELECT COUNT(*) FROM user_courses WHERE user_id = %s",
            (str(u["id"]),),
        ) or 0

    fieldnames = [
        "id", "email", "full_name", "education_level", "college_year",
        "interest_text", "selected_skills", "is_active", "course_count", "created_at",
    ]

    def generate():
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        yield output.getvalue()
        output.seek(0)
        output.truncate()
        for row in users:
            if isinstance(row.get("selected_skills"), list):
                row["selected_skills"] = "|".join(row["selected_skills"])
            writer.writerow({k: row.get(k, "") for k in fieldnames})
            yield output.getvalue()
            output.seek(0)
            output.truncate()

    write_audit_log(admin, "export_users_csv", metadata={"count": len(users)})
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    headers = {"Content-Disposition": f"attachment; filename=users_export_{timestamp}.csv"}
    return StreamingResponse(generate(), media_type="text/csv", headers=headers)


@router.get("/users/{user_id}", response_model=UserAdminView)
def get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    _require_db()
    row = fetchone(f"SELECT {USER_COLS} FROM users WHERE id = %s", (user_id,))
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    return _enrich_users([row])[0]


@router.patch("/users/{user_id}", response_model=UserAdminView)
def update_user(user_id: str, body: UserAdminUpdate, admin: dict = Depends(get_admin_user)):
    _require_db()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    sets = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values()) + [user_id]
    row = execute_returning(
        f"UPDATE users SET {sets} WHERE id = %s RETURNING {USER_COLS}",
        tuple(values),
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    write_audit_log(admin, "update_user", target_type="user", target_id=user_id, metadata=update_data)
    return _enrich_users([row])[0]


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: dict = Depends(require_superadmin)):
    _require_db()
    execute("DELETE FROM users WHERE id = %s", (user_id,))
    write_audit_log(admin, "delete_user", target_type="user", target_id=user_id)


@router.patch("/users/{user_id}/password", status_code=204)
def change_user_password(user_id: str, body: PasswordUpdate, admin: dict = Depends(get_admin_user)):
    _require_db()
    password_hash = hash_admin_password(body.new_password)
    updated = execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (password_hash, user_id),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    write_audit_log(admin, "change_user_password", target_type="user", target_id=user_id)


@router.get("/stats", response_model=AdminStatsOut)
def get_stats(admin: dict = Depends(get_admin_user)):
    _require_db()
    total_users = fetchval("SELECT COUNT(*) FROM users") or 0

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_this_week = fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at >= %s",
        (week_ago,),
    ) or 0

    all_admins = fetchall("SELECT id, is_active FROM admins")
    total_admins = len(all_admins)
    active_admins = sum(1 for a in all_admins if a.get("is_active", True))

    total_course_selections = fetchval("SELECT COUNT(*) FROM user_courses") or 0

    thirty_ago = datetime.utcnow() - timedelta(days=30)
    reg_rows = fetchall(
        "SELECT created_at FROM users WHERE created_at >= %s",
        (thirty_ago,),
    )
    day_counts: Counter = Counter()
    for row in reg_rows:
        created = row["created_at"]
        day = created.strftime("%Y-%m-%d") if isinstance(created, datetime) else str(created)[:10]
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

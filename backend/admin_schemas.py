"""
Admin-specific Pydantic request/response schemas.
Kept separate from schemas.py to avoid polluting the user-facing API.
"""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class AdminRegisterRequest(BaseModel):
    invite_token: str = Field(..., description="One-time UUID invite token")
    email: str
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: str
    email: str
    full_name: Optional[str]
    role: str


# ── Admin CRUD ────────────────────────────────────────────────────────────────

class AdminOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str]


class AdminUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(superadmin|admin)$")
    is_active: Optional[bool] = None


class AdminCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    role: str = Field(default="admin", pattern="^(superadmin|admin)$")


class PasswordUpdate(BaseModel):
    new_password: str = Field(..., min_length=8)



# ── Invite ────────────────────────────────────────────────────────────────────

class InviteCreateRequest(BaseModel):
    email: Optional[str] = None
    role: str = Field(default="admin", pattern="^(superadmin|admin)$")
    expires_in_hours: int = Field(default=48, ge=1, le=168)


class InviteOut(BaseModel):
    id: str
    token: str
    email: Optional[str]
    role: str
    used: bool
    expires_at: str
    created_at: str


# ── User Admin View ───────────────────────────────────────────────────────────

class UserAdminView(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    education_level: Optional[str] = None
    college_year: Optional[str] = None
    interest_text: Optional[str] = None
    selected_skills: Optional[List[str]] = None
    is_active: bool = True
    course_count: int = 0
    created_at: str


class UserAdminUpdate(BaseModel):
    email: Optional[str] = None
    is_active: Optional[bool] = None


# ── Stats ─────────────────────────────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total_users: int
    new_users_this_week: int
    total_admins: int
    active_admins: int
    total_course_selections: int
    registrations_last_30_days: List[Dict[str, Any]] = []


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedUsersResponse(BaseModel):
    data: List[UserAdminView]
    total: int
    page: int
    page_size: int
    total_pages: int

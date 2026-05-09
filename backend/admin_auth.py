"""
Admin authentication utilities.

Intentionally separate from auth.py so that:
  - Admin JWTs use a DIFFERENT secret (ADMIN_JWT_SECRET)
  - Admin tokens carry scope="admin" — a regular user token can never pass
  - Rate limiting is applied at the login level
"""
import os
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# ── Secrets ──────────────────────────────────────────────────────────────────
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "xplaina_admin_secret_CHANGE_IN_PROD_v1")
ADMIN_JWT_ALGORITHM = "HS256"
ADMIN_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8-hour sessions

# ── Rate limiting (in-memory, per-process) ───────────────────────────────────
# Tracks failed login attempts: { email -> [(timestamp, ...), ...] }
_failed_attempts: dict = defaultdict(list)
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 minutes

oauth2_admin_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login", auto_error=False)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_admin_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_admin_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_admin_token(data: dict) -> str:
    payload = data.copy()
    payload["scope"] = "admin"
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ADMIN_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)


def decode_admin_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
        return payload
    except Exception:
        return None


# ── Rate limiting helpers ─────────────────────────────────────────────────────

def record_failed_attempt(email: str) -> None:
    now = time.time()
    _failed_attempts[email].append(now)
    # Trim old entries outside the lockout window
    _failed_attempts[email] = [t for t in _failed_attempts[email] if now - t < LOCKOUT_SECONDS]


def clear_failed_attempts(email: str) -> None:
    _failed_attempts.pop(email, None)


def is_rate_limited(email: str) -> bool:
    now = time.time()
    recent = [t for t in _failed_attempts.get(email, []) if now - t < LOCKOUT_SECONDS]
    return len(recent) >= MAX_ATTEMPTS


# ── FastAPI dependency: authenticated admin ───────────────────────────────────

def get_admin_user(token: str = Depends(oauth2_admin_scheme)) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_admin_token(token)
    if not payload or payload.get("scope") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
        )
    if not payload.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated",
        )
    return payload


def require_superadmin(admin: dict = Depends(get_admin_user)) -> dict:
    if admin.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return admin


# ── Invite token helper ───────────────────────────────────────────────────────

def generate_invite_token() -> str:
    return str(uuid.uuid4())

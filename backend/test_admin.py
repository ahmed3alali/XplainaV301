"""
Admin API test suite.
Run from the backend directory:
    cd backend && python -m pytest test_admin.py -v
"""
import os, sys, json, uuid
from pathlib import Path

# Ensure backend directory is on the path
sys.path.insert(0, str(Path(__file__).parent))

import pytest
from fastapi.testclient import TestClient

# ── Minimal env so supabase client doesn't crash on import ───────────────────
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test_anon_key_placeholder_value_12345")
os.environ.setdefault("ADMIN_SERVICE_ROLE_KEY", "test_service_key_placeholder_value_1234")
os.environ.setdefault("ADMIN_JWT_SECRET", "test_admin_secret_for_tests_must_be_32_chars!")
os.environ.setdefault("JWT_SECRET_KEY", "test_user_secret_for_tests_must_be_32_chars_!")


# Patch supabase client to avoid real network calls during unit tests
import unittest.mock as mock

# ── Import app after env is set ───────────────────────────────────────────────
from admin_auth import (
    hash_admin_password,
    verify_admin_password,
    create_admin_token,
    decode_admin_token,
    record_failed_attempt,
    clear_failed_attempts,
    is_rate_limited,
    MAX_ATTEMPTS,
)


# ═══════════════════════════════════════════════════════════════════
# 1. Password hashing
# ═══════════════════════════════════════════════════════════════════

def test_password_hash_roundtrip():
    pw = "MySecureP@ss123!"
    hashed = hash_admin_password(pw)
    assert hashed != pw
    assert verify_admin_password(pw, hashed)


def test_wrong_password_fails():
    hashed = hash_admin_password("correct_password")
    assert not verify_admin_password("wrong_password", hashed)


# ═══════════════════════════════════════════════════════════════════
# 2. JWT — admin vs user token isolation
# ═══════════════════════════════════════════════════════════════════

def test_admin_token_has_scope():
    token = create_admin_token({"sub": "admin-id", "role": "admin", "email": "a@b.com", "is_active": True})
    payload = decode_admin_token(token)
    assert payload["scope"] == "admin"
    assert payload["sub"] == "admin-id"


def test_user_token_rejected_as_admin_token():
    """A JWT signed with the user secret must not decode successfully with admin secret."""
    import jwt as pyjwt
    user_token = pyjwt.encode(
        {"sub": "user-123", "type": "real_user", "scope": "user"},
        "test_user_secret_for_tests",
        algorithm="HS256",
    )
    # Trying to decode with admin secret should return None (wrong secret)
    result = decode_admin_token(user_token)
    assert result is None


def test_expired_token_rejected():
    from datetime import datetime, timedelta
    import jwt as pyjwt
    from admin_auth import ADMIN_JWT_SECRET, ADMIN_JWT_ALGORITHM

    past = datetime.utcnow() - timedelta(hours=1)
    token = pyjwt.encode(
        {"sub": "admin-id", "scope": "admin", "exp": past},
        ADMIN_JWT_SECRET,
        algorithm=ADMIN_JWT_ALGORITHM,
    )
    result = decode_admin_token(token)
    assert result is None


# ═══════════════════════════════════════════════════════════════════
# 3. Rate limiting
# ═══════════════════════════════════════════════════════════════════

def test_rate_limit_triggers_after_max_attempts():
    email = f"ratelimit_test_{uuid.uuid4()}@test.com"
    clear_failed_attempts(email)

    for _ in range(MAX_ATTEMPTS):
        assert not is_rate_limited(email)
        record_failed_attempt(email)

    assert is_rate_limited(email)


def test_rate_limit_clears_on_success():
    email = f"ratelimit_clear_{uuid.uuid4()}@test.com"
    for _ in range(MAX_ATTEMPTS):
        record_failed_attempt(email)
    assert is_rate_limited(email)
    clear_failed_attempts(email)
    assert not is_rate_limited(email)


# ═══════════════════════════════════════════════════════════════════
# 4. FastAPI endpoint security — using TestClient with mocked Supabase
# ═══════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def client():
    """
    Creates a TestClient with supabase patched out so tests run without
    a real database. Tests validate security logic, not DB operations.
    """
    with mock.patch("api_admin.get_admin_supabase") as mock_sb_factory:
        # Default: return a mock that raises to simulate DB errors
        mock_sb_factory.return_value = mock.MagicMock()
        # Import app here so the patch is already active
        from main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


def make_admin_token(role="admin", is_active=True):
    return create_admin_token({
        "sub": str(uuid.uuid4()),
        "email": "test@admin.com",
        "role": role,
        "is_active": is_active,
    })


def test_get_admins_no_token(client):
    res = client.get("/admin/admins")
    assert res.status_code == 401


def test_get_users_no_token(client):
    res = client.get("/admin/users")
    assert res.status_code == 401


def test_get_stats_no_token(client):
    res = client.get("/admin/stats")
    assert res.status_code == 401


def test_create_invite_requires_superadmin(client):
    """A regular admin token should be rejected for creating invites."""
    token = make_admin_token(role="admin")
    res = client.post(
        "/admin/invites",
        json={"role": "admin", "expires_in_hours": 24},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_deactivated_admin_token_rejected(client):
    token = make_admin_token(is_active=False)
    res = client.get("/admin/admins", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_invalid_jwt_rejected(client):
    res = client.get("/admin/admins", headers={"Authorization": "Bearer totally.fake.token"})
    assert res.status_code == 401


def test_export_endpoint_exists(client):
    """Export endpoint should exist (returns 401 without token, not 404)."""
    res = client.get("/admin/users/export")
    assert res.status_code == 401


def test_health_endpoint_still_works(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ═══════════════════════════════════════════════════════════════════
# 5. Admin schemas validation
# ═══════════════════════════════════════════════════════════════════

def test_admin_register_schema_requires_token():
    from admin_schemas import AdminRegisterRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        AdminRegisterRequest(email="a@b.com", password="pass1234")


def test_admin_update_schema_role_validation():
    from admin_schemas import AdminUpdate
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        AdminUpdate(role="hacker")  # invalid role


def test_admin_update_schema_valid_roles():
    from admin_schemas import AdminUpdate
    assert AdminUpdate(role="admin").role == "admin"
    assert AdminUpdate(role="superadmin").role == "superadmin"


def test_invite_schema_hours_bounds():
    from admin_schemas import InviteCreateRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        InviteCreateRequest(role="admin", expires_in_hours=0)  # below min
    with pytest.raises(ValidationError):
        InviteCreateRequest(role="admin", expires_in_hours=999)  # above max


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

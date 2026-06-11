from fastapi import APIRouter, HTTPException, Depends, status
import logging
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer

from auth import create_access_token, decode_access_token, get_password_hash, verify_password
from db import fetchone, execute_returning, get_database_url

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"user_id": payload.get("sub"), "user_type": payload.get("type")}


router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    identifier: str
    password: str


def _require_db():
    try:
        get_database_url()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/signup")
def signup(user: UserCreate):
    """Register a new student account (stored in Postgres)."""
    _require_db()
    try:
        existing = fetchone("SELECT id FROM users WHERE email = %s", (user.email,))
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered.")

        password_hash = get_password_hash(user.password)
        row = execute_returning(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (user.email, password_hash),
        )
        if not row:
            raise HTTPException(status_code=400, detail="Sign-up failed.")

        user_id = str(row["id"])
        token = create_access_token({"sub": user_id, "type": "real_user"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_type": "real_user",
            "user_id": user_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Signup error")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/auth/login")
def login(user: UserLogin):
    """
    Login endpoint:
    1. Dataset users — numeric ID + fixed password
    2. Real users     — email/password from users table
    """
    if user.identifier.isdigit() and user.password == "test000":
        token = create_access_token({"sub": user.identifier, "type": "dataset_user"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_type": "dataset_user",
            "user_id": user.identifier,
        }

    _require_db()
    try:
        row = fetchone(
            "SELECT id, password_hash FROM users WHERE email = %s",
            (user.identifier,),
        )
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(user.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = str(row["id"])
        token = create_access_token({"sub": user_id, "type": "real_user"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_type": "real_user",
            "user_id": user_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Login error")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

from fastapi import APIRouter, HTTPException, Depends, status
import logging
import os
import uuid
from supabase import create_client, Client
from pydantic import BaseModel
from auth import create_access_token, decode_access_token, get_password_hash, verify_password
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"user_id": payload.get("sub"), "user_type": payload.get("type")}

router = APIRouter()

def get_supabase() -> Client:
    """Create a Supabase client lazily so it always picks up the current env vars."""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured.")
    return create_client(url, key)


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    identifier: str
    password: str


@router.post("/auth/signup")
def signup(user: UserCreate):
    """
    Sign up a new real user using custom users table in Supabase.
    """
    supabase = get_supabase()
    try:
        # Check if email is already registered
        res = supabase.table("users").select("id").eq("email", user.email).execute()
        if res.data and len(res.data) > 0:
            raise HTTPException(status_code=400, detail="Email already registered.")

        # Hash password and create user
        password_hash = get_password_hash(user.password)
        new_user = supabase.table("users").insert({
            "email": user.email,
            "password_hash": password_hash
        }).execute()
        
        if not new_user.data or len(new_user.data) == 0:
            raise HTTPException(status_code=400, detail="Sign-up failed.")

        user_id = str(new_user.data[0]["id"])
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
    Login endpoint that handles:
    1. Dataset users  — numeric ID + fixed password
    2. Real users     — email/password using custom users table
    """
    # 1. Dataset user fallback (numeric ID + shared password)
    if user.identifier.isdigit() and user.password == "test000":
        token = create_access_token({"sub": user.identifier, "type": "dataset_user"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_type": "dataset_user",
            "user_id": user.identifier,
        }

    # 2. Real user via custom users table
    supabase = get_supabase()
    try:
        res = supabase.table("users").select("id, password_hash").eq("email", user.identifier).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_record = res.data[0]
        if not verify_password(user.password, user_record["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = str(user_record["id"])
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


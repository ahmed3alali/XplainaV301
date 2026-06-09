#!/usr/bin/env python3
"""
Create demo admin + student accounts in Supabase.

Usage (from repo root):
    cd backend && python seed_demo_users.py

Credentials (also documented in frontend/env.example):
    Admin:   admin@claripath.dev  / Claripath@Admin1
    Student: student@claripath.dev / Claripath@Student1
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from supabase import create_client

from admin_auth import hash_admin_password
from auth import get_password_hash

DEMO_ADMIN = {
    "email": "admin@claripath.dev",
    "password": "Claripath@Admin1",
    "full_name": "Claripath Demo Admin",
    "role": "superadmin",
}

DEMO_STUDENT = {
    "email": "student@claripath.dev",
    "password": "Claripath@Student1",
    "full_name": "Claripath Demo Student",
}


def client():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("ADMIN_SERVICE_ROLE_KEY") or os.environ.get(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY", ""
    )
    if not url or not key:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and ADMIN_SERVICE_ROLE_KEY in backend/.env")
        sys.exit(1)
    return create_client(url, key)


def upsert_admin(sb) -> None:
    email = DEMO_ADMIN["email"]
    existing = sb.table("admins").select("id").eq("email", email).execute()
    row = {
        "email": email,
        "password_hash": hash_admin_password(DEMO_ADMIN["password"]),
        "full_name": DEMO_ADMIN["full_name"],
        "role": DEMO_ADMIN["role"],
        "is_active": True,
    }
    if existing.data:
        sb.table("admins").update(row).eq("email", email).execute()
        print(f"Updated admin: {email}")
    else:
        sb.table("admins").insert(row).execute()
        print(f"Created admin: {email}")


def upsert_student(sb) -> None:
    email = DEMO_STUDENT["email"]
    existing = sb.table("users").select("id").eq("email", email).execute()
    row = {
        "email": email,
        "password_hash": get_password_hash(DEMO_STUDENT["password"]),
        "full_name": DEMO_STUDENT["full_name"],
        "is_active": True,
    }
    if existing.data:
        sb.table("users").update(row).eq("email", email).execute()
        print(f"Updated student: {email}")
    else:
        sb.table("users").insert(row).execute()
        print(f"Created student: {email}")


def main() -> None:
    sb = client()
    upsert_admin(sb)
    upsert_student(sb)
    print()
    print("Demo credentials:")
    print(f"  Admin panel (/admin/login):  {DEMO_ADMIN['email']} / {DEMO_ADMIN['password']}")
    print(f"  Student app (/login):        {DEMO_STUDENT['email']} / {DEMO_STUDENT['password']}")


if __name__ == "__main__":
    main()

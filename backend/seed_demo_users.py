#!/usr/bin/env python3
"""
Create demo admin + student accounts in Postgres.

Usage:
    cd backend && python seed_demo_users.py

Credentials:
    Admin:   admin@claripath.dev  / Claripath@Admin1
    Student: student@claripath.dev / Claripath@Student1
"""
from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from admin_auth import hash_admin_password
from auth import get_password_hash
from db import execute, execute_returning, fetchone, get_database_url, init_pool

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


def upsert_admin() -> None:
    email = DEMO_ADMIN["email"]
    password_hash = hash_admin_password(DEMO_ADMIN["password"])
    existing = fetchone("SELECT id FROM admins WHERE email = %s", (email,))
    if existing:
        execute(
            """
            UPDATE admins
            SET password_hash = %s, full_name = %s, role = %s, is_active = true
            WHERE email = %s
            """,
            (password_hash, DEMO_ADMIN["full_name"], DEMO_ADMIN["role"], email),
        )
        print(f"Updated admin: {email}")
    else:
        execute_returning(
            """
            INSERT INTO admins (email, password_hash, full_name, role, is_active)
            VALUES (%s, %s, %s, %s, true)
            RETURNING id
            """,
            (email, password_hash, DEMO_ADMIN["full_name"], DEMO_ADMIN["role"]),
        )
        print(f"Created admin: {email}")


def upsert_student() -> None:
    email = DEMO_STUDENT["email"]
    password_hash = get_password_hash(DEMO_STUDENT["password"])
    existing = fetchone("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        execute(
            """
            UPDATE users
            SET password_hash = %s, full_name = %s, is_active = true
            WHERE email = %s
            """,
            (password_hash, DEMO_STUDENT["full_name"], email),
        )
        print(f"Updated student: {email}")
    else:
        execute_returning(
            """
            INSERT INTO users (email, password_hash, full_name, is_active)
            VALUES (%s, %s, %s, true)
            RETURNING id
            """,
            (email, password_hash, DEMO_STUDENT["full_name"]),
        )
        print(f"Created student: {email}")


def main() -> None:
    try:
        get_database_url()
    except RuntimeError:
        print("ERROR: Set DATABASE_URL in backend/.env")
        sys.exit(1)

    init_pool()
    upsert_admin()
    upsert_student()
    print()
    print("Demo credentials:")
    print(f"  Admin panel (/admin/login):  {DEMO_ADMIN['email']} / {DEMO_ADMIN['password']}")
    print(f"  Student app (/login):        {DEMO_STUDENT['email']} / {DEMO_STUDENT['password']}")


if __name__ == "__main__":
    main()

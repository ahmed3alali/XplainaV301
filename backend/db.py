"""
PostgreSQL access via connection pool.

Supabase is only the hosted Postgres provider — no Supabase JS/Python client or API keys.
Set DATABASE_URL to the Supabase pooler URL (port 6543).
"""
import os
from contextlib import contextmanager
from typing import Any, Optional

from psycopg2 import pool
from psycopg2.extras import RealDictCursor

_pool: Optional[pool.ThreadedConnectionPool] = None


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Use the Supabase Postgres connection pool URL."
        )
    return url


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(minconn, maxconn, get_database_url())


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn():
    if _pool is None:
        init_pool()
    assert _pool is not None
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def fetchone(sql: str, params: tuple | None = None) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            return dict(row) if row else None


def fetchall(sql: str, params: tuple | None = None) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            return [dict(r) for r in cur.fetchall()]


def fetchval(sql: str, params: tuple | None = None) -> Any:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            return row[0] if row else None


def execute(sql: str, params: tuple | None = None) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount


def execute_returning(sql: str, params: tuple | None = None) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            return dict(row) if row else None


def executemany(sql: str, params_seq: list[tuple]) -> None:
    if not params_seq:
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, params_seq)


def ping() -> bool:
    try:
        fetchval("SELECT 1")
        return True
    except Exception:
        return False

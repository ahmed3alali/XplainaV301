-- ============================================================
-- XplainaV301 Admin Panel — Database Migration
-- Run this in your Supabase SQL Editor ONCE
-- ============================================================

-- 1. Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- 2. One-time invite tokens (no static secrets)
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT UNIQUE NOT NULL,
  email      TEXT,                              -- optional pre-assigned email
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_invites DISABLE ROW LEVEL SECURITY;

-- 3. Audit log for all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  admin_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log DISABLE ROW LEVEL SECURITY;

-- 4. Ensure users table has all required profile columns
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS full_name        TEXT,
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS college_year    TEXT,
  ADD COLUMN IF NOT EXISTS interest_text   TEXT,
  ADD COLUMN IF NOT EXISTS selected_skills TEXT[],
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- SEED FIRST SUPERADMIN
-- 1. Generate a bcrypt hash on your machine:
--    python3 -c "import bcrypt; print(bcrypt.hashpw(b'YourStrongP@ss!', bcrypt.gensalt(12)).decode())"
-- 2. Replace the hash below and uncomment:
-- ============================================================
INSERT INTO public.admins (email, password_hash, full_name, role)
VALUES (
  'info.claripath@claripath.dev',
  '$2b$12$bdrMhEInl.jy7WtS07VemeRV2kUfo1cNDviOo10QMyZtSGS5dIpVe',
  'Claripath Admin',
  'superadmin'
) ON CONFLICT (email) DO NOTHING;

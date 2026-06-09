-- Demo admin + student accounts for Claripath
-- Run in Supabase SQL Editor (or: cd backend && python3 seed_demo_users.py)

-- Admin panel → /admin/login
INSERT INTO public.admins (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@claripath.dev',
  '$2b$12$ltepmqyLE2Zb8wHZVC.ux.XjRTCn3CHPHFzG6y0SXZ8DpR/SSvvrK',
  'Claripath Demo Admin',
  'superadmin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true;

-- Student app → /login
INSERT INTO public.users (email, password_hash, full_name, is_active)
VALUES (
  'student@claripath.dev',
  '$2b$12$S45rybYHu.7yyxzWtBtLGu/NW.PQwdhc/hA.j/eH.TQ4zu8C5KbEG',
  'Claripath Demo Student',
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  is_active = true;

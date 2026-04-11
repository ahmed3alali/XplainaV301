-- Run this in your Supabase SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: user_courses already exists for the real users as we saw in main.py:
-- it queries: sb.table("user_courses").select("course_id").eq("user_id", user_id).execute()
-- But just in case, we will ensure it's created:
CREATE TABLE IF NOT EXISTS public.user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Note: Depending on your Supabase setup, Row-Level Security (RLS)
-- might be automatically enabled on newly created tables. Since we are
-- handling all authentication and data validation directly in our FastAPI
-- backend, we should disable RLS for these tables to allow queries
-- from the standard 'anon' client used by our backend.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses DISABLE ROW LEVEL SECURITY;

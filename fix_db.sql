-- RUN THIS ENTIRE SNIPPET IN YOUR SUPABASE SQL EDITOR --

-- 1. Drop the incorrect foreign key constraint pointing to the old auth.users table
ALTER TABLE IF EXISTS public.user_courses 
  DROP CONSTRAINT IF EXISTS user_courses_user_id_fkey;

-- 2. Add the correct foreign key constraint pointing to our new public.users table
ALTER TABLE public.user_courses
  ADD CONSTRAINT user_courses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. (Optional but recommended) Re-disable RLS just in case it re-enabled
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses DISABLE ROW LEVEL SECURITY;

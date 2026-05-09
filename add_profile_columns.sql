-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Adds onboarding profile columns to the users table.
-- All columns are nullable so existing rows are not affected.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS education_level  TEXT,          -- 'undergraduate' | 'graduate' | 'phd'
  ADD COLUMN IF NOT EXISTS college_year     TEXT,          -- e.g. '2nd Year', 'Year 1'
  ADD COLUMN IF NOT EXISTS interest_text    TEXT,          -- free-text the student typed
  ADD COLUMN IF NOT EXISTS selected_skills  TEXT[];        -- array of genre/skill names

-- Optional: add a comment so future devs know the source
COMMENT ON COLUMN users.education_level  IS 'Populated by the onboarding wizard (XplainaV301)';
COMMENT ON COLUMN users.college_year     IS 'Populated by the onboarding wizard (XplainaV301)';
COMMENT ON COLUMN users.interest_text    IS 'Free-text interest statement entered by the student';
COMMENT ON COLUMN users.selected_skills  IS 'Genre/skill IDs selected during onboarding (maps to GENRE_COLS)';

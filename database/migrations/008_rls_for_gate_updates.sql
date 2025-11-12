-- Migration: RLS Policies for Gate Updates Without Service Role
-- Description: Allow users to update their own gate info using anon key

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data (including gate fields)
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Allow authenticated users to insert their own record
-- This is needed if the trigger fails or user doesn't exist yet
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verification query
-- Run this to check policies are working:
-- SELECT * FROM pg_policies WHERE tablename = 'users';

COMMENT ON POLICY "Users can view own data" ON public.users IS 'Allows users to view their own user record';
COMMENT ON POLICY "Users can update own data" ON public.users IS 'Allows users to update their own user record, including gate fields';
COMMENT ON POLICY "Users can insert own data" ON public.users IS 'Allows users to create their own user record if trigger fails';

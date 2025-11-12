-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This sets up RLS policies for gate integration without service role
-- =============================================

-- Step 1: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Step 3: Create policies for authenticated users

-- Policy 1: Users can view their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update their own data (including gate fields)
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own record
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Verification - Check policies were created
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN policyname LIKE '%view%' THEN '✅ Allows users to SELECT their own data'
    WHEN policyname LIKE '%update%' THEN '✅ Allows users to UPDATE their own data'  
    WHEN policyname LIKE '%insert%' THEN '✅ Allows users to INSERT their own data'
  END as description
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd;

-- =============================================
-- EXPECTED RESULT:
-- You should see 3 policies:
-- 1. Users can insert own data (INSERT)
-- 2. Users can view own data (SELECT)
-- 3. Users can update own data (UPDATE)
-- =============================================

-- If you see the 3 policies above, you're done! ✅
-- Now restart your dev server and login again.

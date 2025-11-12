-- Migration: Auto-create user entry when auth user signs up
-- Description: Trigger to automatically populate public.users table when auth.users is created

-- Function to create user entry for new auth user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user with auth data
  INSERT INTO public.users (
    id,
    email,
    phone,
    name,
    balance,
    daily_limit,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, ''),  -- Use phone from auth metadata if available
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    0.00,        -- Start with 0 balance
    100000.00,   -- 100k KES daily limit
    true,        -- Active by default
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't fail if user already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

-- ============================================
-- BACKFILL EXISTING AUTH USERS
-- ============================================
-- Create user entries for any existing auth users who don't have one

INSERT INTO public.users (
  id,
  email,
  phone,
  name,
  balance,
  daily_limit,
  is_active,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.phone, ''),
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', ''),
  0.00,
  100000.00,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all auth users have corresponding user entries

-- This query should return 0 rows if everything is working correctly:
-- SELECT 
--   au.id,
--   au.email,
--   au.created_at as auth_created,
--   CASE 
--     WHEN pu.id IS NULL THEN '❌ NO USER ENTRY'
--     ELSE '✅ HAS USER ENTRY'
--   END as status
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE pu.id IS NULL
-- ORDER BY au.created_at DESC;

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Automatically creates a user entry in public.users when a new auth.users record is created';

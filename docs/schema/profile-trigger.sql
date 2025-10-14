-- ============================================
-- AUTO CREATE PROFILE ON USER SIGNUP
-- ============================================
-- This trigger automatically creates a profile entry
-- whenever a new user signs up via Supabase Auth

-- Function to create profile for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile with user's auth data
  INSERT INTO public.profiles (
    id, 
    email, 
    wallet_balance, 
    daily_limit, 
    monthly_limit, 
    kyc_verified, 
    wallet_type, 
    active,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    0.00,        -- Start with 0 balance
    100000.00,   -- 100k daily limit
    500000.00,   -- 500k monthly limit
    false,       -- Not KYC verified yet
    'wallet',    -- Default wallet type
    true,        -- Active by default
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't fail if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BACKFILL EXISTING USERS
-- ============================================
-- Create profiles for any existing users who don't have one

INSERT INTO public.profiles (
  id, 
  email, 
  wallet_balance, 
  daily_limit, 
  monthly_limit, 
  kyc_verified, 
  wallet_type, 
  active,
  created_at, 
  updated_at
)
SELECT 
  u.id,
  u.email,
  0.00,
  100000.00,
  500000.00,
  false,
  'wallet',
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFY
-- ============================================
-- Check all users have profiles
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.wallet_balance,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    ELSE '✅ HAS PROFILE'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Ensure the function can be executed
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================
-- DONE!
-- ============================================
-- Now every new user signup will automatically:
-- 1. Create auth.users entry (by Supabase)
-- 2. Trigger fires
-- 3. Create profiles entry with wallet_balance = 0
-- 4. User can immediately start using the app!

/*
BENEFITS:
✅ Automatic profile creation
✅ No manual intervention needed
✅ Works with all signup methods (email, OAuth, etc.)
✅ Backfills existing users
✅ Safe (ON CONFLICT prevents duplicates)
*/

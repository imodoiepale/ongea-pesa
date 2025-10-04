-- ============================================
-- FIX PROFILES TABLE - Allow NULL phone_number
-- ============================================
-- This fixes the NOT NULL constraint issue

-- Make phone_number nullable (users can add it later)
ALTER TABLE profiles 
ALTER COLUMN phone_number DROP NOT NULL;

-- Also make other optional fields nullable
ALTER TABLE profiles 
ALTER COLUMN mpesa_number DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN bank_account DROP NOT NULL;

-- Set defaults for numeric fields if they're NULL
UPDATE profiles 
SET 
  wallet_balance = 0 
WHERE wallet_balance IS NULL;

UPDATE profiles
SET 
  daily_limit = 100000,
  monthly_limit = 500000
WHERE daily_limit IS NULL OR monthly_limit IS NULL;

-- Verify the changes
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- DONE! Now profiles can be created without phone
-- ============================================

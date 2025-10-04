-- ============================================
-- URGENT FIX - Run This NOW!
-- ============================================
-- This fixes the phone_number constraint and creates your profile

-- Step 1: Fix the schema (allow nullable phone)
ALTER TABLE profiles 
ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN mpesa_number DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN bank_account DROP NOT NULL;

-- Step 2: Create profile for your user
INSERT INTO profiles (
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
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'ijepale@gmail.com',
  0.00,
  100000.00,
  500000.00,
  false,
  'wallet',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 3: If you have transactions, sync balance
UPDATE profiles
SET wallet_balance = COALESCE(
  (
    SELECT SUM(
      CASE 
        WHEN t.type IN ('deposit', 'receive') THEN t.amount
        ELSE -t.amount
      END
    )
    FROM transactions t
    WHERE t.user_id = profiles.id 
      AND t.status = 'completed'
  ), 0
)
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- Step 4: Verify
SELECT 
  id,
  email,
  wallet_balance,
  phone_number,
  created_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- ============================================
-- DONE! Refresh your app now!
-- ============================================

-- ============================================
-- FIX TRANSACTIONS TABLE CONSTRAINTS
-- ============================================
-- This fixes the amount constraint and ensures proper data types

-- Check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE '%amount%';

-- Drop the problematic constraint if it exists
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_amount_check;

-- Add proper constraint (amount must be positive)
ALTER TABLE transactions 
ADD CONSTRAINT transactions_amount_check 
CHECK (amount > 0);

-- Ensure amount column is numeric type
ALTER TABLE transactions 
ALTER COLUMN amount TYPE NUMERIC(10, 2);

-- Verify the changes
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'amount';

-- ============================================
-- TEST INSERT
-- ============================================
/*
-- Test with valid amount
INSERT INTO transactions (
  user_id,
  type,
  amount,
  phone,
  status,
  voice_command_text
) VALUES (
  'YOUR-USER-ID',
  'send_phone',
  200.00,
  '254743854888',
  'completed',
  'Send 200 to 0743854888'
);

-- Check if balance was deducted
SELECT wallet_balance FROM profiles WHERE id = 'YOUR-USER-ID';
*/

-- ============================================
-- DONE!
-- ============================================

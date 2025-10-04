-- ============================================
-- DEBUG: Why Balance Not Reducing
-- ============================================

-- Step 1: Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions';

-- Step 2: Check recent transactions
SELECT 
  id,
  user_id,
  type,
  amount,
  status,
  completed_at,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check user's current balance
SELECT 
  id,
  email,
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- Step 4: Calculate what balance SHOULD be
SELECT 
  SUM(CASE 
    WHEN type IN ('deposit', 'receive') THEN amount
    ELSE -amount
  END) as calculated_balance,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type IN ('deposit', 'receive') THEN amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN type NOT IN ('deposit', 'receive') THEN amount ELSE 0 END) as total_sends
FROM transactions
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'
  AND status = 'completed';

-- Step 5: Check constraint on amount
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE '%amount%';

-- Step 6: Test if trigger function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'update_wallet_balance';

-- ============================================
-- MANUAL TEST: Create a send transaction
-- ============================================
/*
-- Add balance first
INSERT INTO transactions (
  user_id,
  type,
  amount,
  status,
  voice_command_text,
  completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'deposit',
  1000.00,
  'completed',
  'Test deposit',
  NOW()
);

-- Check balance increased
SELECT wallet_balance FROM profiles WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- Now send money
INSERT INTO transactions (
  user_id,
  type,
  amount,
  phone,
  status,
  voice_command_text,
  completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'send_phone',
  200.00,
  '254743854888',
  'completed',
  'Send 200 to test',
  NOW()
);

-- Check balance decreased
SELECT wallet_balance FROM profiles WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
*/

-- ============================================
-- COMMON ISSUES AND FIXES
-- ============================================

-- Issue 1: Trigger not installed
-- Fix: Run AUTO_BALANCE_UPDATE_TRIGGER.sql

-- Issue 2: Amount constraint too strict
-- Fix: Run FIX_TRANSACTIONS_CONSTRAINT.sql

-- Issue 3: Status not 'completed'
-- Fix: Ensure n8n sets status='completed'

-- Issue 4: Amount is string not number
-- Fix: In n8n, use {{ $json.amount }} not "{{ $json.amount }}"

-- ============================================
-- DONE!
-- ============================================

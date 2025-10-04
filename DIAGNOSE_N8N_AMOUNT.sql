-- ============================================
-- DIAGNOSE n8n Amount Issue
-- ============================================

-- Your constraint is:
-- amount > 0 AND amount <= 999999
-- So valid range: 0.01 to 999,999.00

-- Check recent failed transactions (if any logged)
SELECT 
  created_at,
  type,
  amount,
  phone,
  status,
  error_message
FROM transactions
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'
ORDER BY created_at DESC
LIMIT 10;

-- Test valid amounts
-- These should ALL work:

-- Test 1: Small amount
INSERT INTO transactions (
  user_id, type, amount, phone, status, completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'deposit',
  100.00,
  '',
  'completed',
  NOW()
) RETURNING id, amount;

-- Test 2: Decimal amount (like 200 shillings)
INSERT INTO transactions (
  user_id, type, amount, phone, status, completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'send_phone',
  200.00,
  '254743854888',
  'completed',
  NOW()
) RETURNING id, amount;

-- Check balance after
SELECT 
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- ============================================
-- Common n8n Issues & Tests
-- ============================================

-- Issue 1: n8n sending string "200" instead of number 200
-- This might get cast to 200.00 but could cause issues

-- Issue 2: n8n sending 0 or negative
-- Would violate: amount > 0

-- Issue 3: n8n sending > 999999
-- Would violate: amount <= 999999

-- Issue 4: n8n sending NULL
-- Would violate: NOT NULL constraint

-- Issue 5: n8n sending with wrong decimal format
-- Like "200.5.5" or "two hundred"

-- ============================================
-- What to check in n8n webhook logs
-- ============================================

/*
Look for the EXACT value being sent in n8n logs:

Good:
{
  "amount": 200,           ✅ Number
  "amount": 200.00,        ✅ Number with decimals
  "amount": "200",         ⚠️ String (might work but risky)
  "amount": "200.00"       ⚠️ String (might work but risky)
}

Bad:
{
  "amount": "0",           ❌ Would fail constraint
  "amount": 0,             ❌ Would fail constraint  
  "amount": -200,          ❌ Would fail constraint
  "amount": "",            ❌ Would fail constraint
  "amount": null,          ❌ Would fail NOT NULL
  "amount": "two hundred", ❌ Not a number
}
*/

-- ============================================
-- Check your current balance and transactions
-- ============================================

SELECT 
  'Current State' as info,
  wallet_balance,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND status = 'completed') as completed_txns,
  (SELECT SUM(amount) FROM transactions WHERE user_id = p.id AND type = 'deposit' AND status = 'completed') as total_deposits,
  (SELECT SUM(amount) FROM transactions WHERE user_id = p.id AND type = 'send_phone' AND status = 'completed') as total_sends
FROM profiles p
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';

-- ============================================
-- DONE - Results will show the exact issue
-- ============================================

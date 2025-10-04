-- ============================================
-- UPDATE TRANSACTIONS TABLE FOR DEPOSITS
-- ============================================
-- Run this in Supabase SQL Editor

-- Add 'deposit' as a valid transaction type
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (
  type = ANY (
    ARRAY[
      'send_phone'::text,
      'buy_goods_pochi'::text,
      'buy_goods_till'::text,
      'paybill'::text,
      'withdraw'::text,
      'bank_to_mpesa'::text,
      'mpesa_to_bank'::text,
      'deposit'::text,  -- NEW: For manual balance adds
      'receive'::text   -- NEW: For receiving money
    ]
  )
);

-- ============================================
-- VERIFY
-- ============================================
-- Test that deposit type now works
/*
INSERT INTO transactions (
  user_id,
  type,
  amount,
  status,
  voice_command_text
) VALUES (
  'YOUR-USER-ID',
  'deposit',
  1000.00,
  'completed',
  'Manual deposit of KSh 1,000'
);
*/

-- Check constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE '%type%';

-- ============================================
-- DONE!
-- ============================================

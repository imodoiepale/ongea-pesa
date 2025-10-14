-- ============================================
-- SYNC WALLET BALANCE FROM TRANSACTIONS
-- ============================================
-- Run this to calculate and update wallet_balance from all transactions
-- Useful if balance is showing 0 but you have transactions

-- Check current balances
SELECT 
  p.id,
  p.wallet_balance as current_balance,
  COALESCE(
    (SELECT SUM(
      CASE 
        WHEN t.type IN ('deposit', 'receive') THEN t.amount
        ELSE -t.amount
      END
    )
    FROM transactions t
    WHERE t.user_id = p.id AND t.status = 'completed'
    ), 0
  ) as calculated_balance
FROM profiles p
WHERE p.wallet_balance != COALESCE(
  (SELECT SUM(
    CASE 
      WHEN t.type IN ('deposit', 'receive') THEN t.amount
      ELSE -t.amount
    END
  )
  FROM transactions t
  WHERE t.user_id = p.id AND t.status = 'completed'
  ), 0
);

-- Update all wallet balances to match transactions
UPDATE profiles p
SET 
  wallet_balance = COALESCE(
    (SELECT SUM(
      CASE 
        WHEN t.type IN ('deposit', 'receive') THEN t.amount
        ELSE -t.amount
      END
    )
    FROM transactions t
    WHERE t.user_id = p.id AND t.status = 'completed'
    ), 0
  ),
  updated_at = NOW();

-- Verify the update
SELECT 
  id,
  wallet_balance,
  updated_at
FROM profiles
ORDER BY updated_at DESC;

-- Check transaction summary for a specific user
/*
SELECT 
  type,
  SUM(amount) as total_amount,
  COUNT(*) as count
FROM transactions
WHERE user_id = 'YOUR-USER-ID'
  AND status = 'completed'
GROUP BY type
ORDER BY type;
*/

-- ============================================
-- DONE!
-- ============================================
-- All wallet balances now match their transactions

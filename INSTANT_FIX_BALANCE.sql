-- ============================================
-- INSTANT FIX - Update Balance from Transactions
-- ============================================
-- Run this NOW in Supabase SQL Editor

-- Update wallet_balance for ALL users based on their transactions
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
);

-- Verify the fix
SELECT 
  p.id,
  p.email,
  p.wallet_balance as balance,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND status = 'completed') as transaction_count
FROM profiles p
JOIN auth.users u ON p.id = u.id;

-- ============================================
-- DONE! Your balance should show now!
-- ============================================

-- ============================================
-- FIX: Balance Showing 0 Despite Transactions
-- ============================================
-- This script fixes the issue where wallet_balance is 0
-- but transactions exist in the database

-- STEP 1: Verify the issue
-- ============================================
SELECT 
  p.id,
  p.phone_number,
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
  ) as should_be_balance,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND status = 'completed') as completed_txns
FROM profiles p;

-- STEP 2: Check if triggers exist
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_name LIKE '%balance%';

-- STEP 3: Recreate the trigger functions
-- ============================================

-- Function for INSERT (when transaction is created as completed)
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_change NUMERIC;
  new_balance NUMERIC;
  credit_types TEXT[] := ARRAY['deposit', 'receive'];
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' THEN
    
    -- Determine if this is a credit or debit
    IF NEW.type = ANY(credit_types) THEN
      -- Add to balance (deposit or receive)
      balance_change := NEW.amount;
    ELSE
      -- Subtract from balance (send, pay, withdraw, etc.)
      balance_change := -NEW.amount;
    END IF;

    -- Update the user's wallet balance
    UPDATE profiles 
    SET 
      wallet_balance = wallet_balance + balance_change,
      updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Get the new balance for logging
    SELECT wallet_balance INTO new_balance
    FROM profiles
    WHERE id = NEW.user_id;

    -- Log the update
    RAISE NOTICE 'Balance updated for user %: % (change: %)', 
      NEW.user_id, new_balance, balance_change;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for UPDATE (when status changes to completed)
CREATE OR REPLACE FUNCTION update_wallet_balance_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  balance_change NUMERIC;
  new_balance NUMERIC;
  credit_types TEXT[] := ARRAY['deposit', 'receive'];
BEGIN
  -- Only when status changes from non-completed to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    
    -- Determine if this is a credit or debit
    IF NEW.type = ANY(credit_types) THEN
      balance_change := NEW.amount;
    ELSE
      balance_change := -NEW.amount;
    END IF;

    -- Update the user's wallet balance
    UPDATE profiles 
    SET 
      wallet_balance = wallet_balance + balance_change,
      updated_at = NOW()
    WHERE id = NEW.user_id;

    SELECT wallet_balance INTO new_balance
    FROM profiles
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Balance updated on status change for user %: % (change: %)', 
      NEW.user_id, new_balance, balance_change;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Drop and recreate triggers
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_status_change ON transactions;

CREATE TRIGGER trigger_update_wallet_balance
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_wallet_balance();

CREATE TRIGGER trigger_update_balance_status_change
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_on_status_change();

-- STEP 5: Sync existing balances from transactions
-- ============================================
-- This recalculates all wallet balances based on completed transactions
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

-- STEP 6: Verify the fix
-- ============================================
SELECT 
  p.id,
  p.phone_number,
  p.wallet_balance,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND status = 'completed') as completed_txns,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND type = 'deposit' AND status = 'completed') as deposits,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id AND type = 'send_phone' AND status = 'completed') as sends
FROM profiles p
ORDER BY p.updated_at DESC;

-- STEP 7: Check specific user (replace with your user_id)
-- ============================================
/*
SELECT 
  type,
  amount,
  status,
  created_at,
  CASE 
    WHEN type IN ('deposit', 'receive') THEN '+' || amount::text
    ELSE '-' || amount::text
  END as balance_effect
FROM transactions
WHERE user_id = 'YOUR-USER-ID-HERE'
  AND status = 'completed'
ORDER BY created_at DESC;
*/

-- ============================================
-- IMPORTANT NOTES
-- ============================================
/*
1. The constraint "profiles_wallet_balance_check" ensures balance >= 0
   This is GOOD - it prevents negative balances

2. The error you're seeing means n8n is trying to create a profile
   with a negative or NULL balance

3. Make sure n8n:
   - Creates transactions with status='completed' for deposits
   - The triggers will automatically update wallet_balance
   - Don't manually set wallet_balance in n8n

4. For new users:
   - Profile should be created with wallet_balance = 0
   - First transaction should be a 'deposit' type
   - Trigger will automatically increase balance

5. Transaction types that ADD to balance:
   - deposit
   - receive

6. Transaction types that SUBTRACT from balance:
   - send_phone
   - buy_goods_pochi
   - buy_goods_till
   - paybill
   - withdraw
   - bank_to_mpesa
   - mpesa_to_bank
*/

-- ============================================
-- DONE!
-- ============================================

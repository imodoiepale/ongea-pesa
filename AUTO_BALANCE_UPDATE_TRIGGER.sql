-- ============================================
-- AUTOMATIC BALANCE UPDATE TRIGGER
-- ============================================
-- This trigger automatically updates wallet_balance
-- when transactions are created or updated

-- Function to update wallet balance
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON transactions;

-- Create trigger for INSERT
CREATE TRIGGER trigger_update_wallet_balance
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_wallet_balance();

-- Also handle UPDATE (when status changes to completed)
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

DROP TRIGGER IF EXISTS trigger_update_balance_status_change ON transactions;

CREATE TRIGGER trigger_update_balance_status_change
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_on_status_change();

-- ============================================
-- VERIFY TRIGGERS
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
ORDER BY trigger_name;

-- ============================================
-- TEST THE TRIGGER
-- ============================================
/*
-- Test 1: Add a deposit (should increase balance)
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
  'Test deposit'
);

-- Check balance
SELECT wallet_balance FROM profiles WHERE id = 'YOUR-USER-ID';

-- Test 2: Add a send (should decrease balance)
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
  500.00,
  '0712345678',
  'completed',
  'Test send'
);

-- Check balance again
SELECT wallet_balance FROM profiles WHERE id = 'YOUR-USER-ID';
*/

-- ============================================
-- HOW IT WORKS
-- ============================================
/*
1. When n8n creates a transaction with status='completed':
   → Trigger fires automatically
   → Calculates balance change (+deposit, -send)
   → Updates profiles.wallet_balance
   → Real-time subscription notifies all clients
   → UI updates instantly!

2. Credit types (add to balance):
   - deposit
   - receive

3. Debit types (subtract from balance):
   - send_phone
   - buy_goods_pochi
   - buy_goods_till
   - paybill
   - withdraw
   - bank_to_mpesa
   - mpesa_to_bank

4. Benefits:
   ✅ Automatic balance calculation
   ✅ No manual updates needed
   ✅ Always accurate
   ✅ Works with n8n
   ✅ Works with manual adds
   ✅ Real-time everywhere
*/

-- ============================================
-- DONE!
-- ============================================

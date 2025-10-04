-- ============================================
-- ONGEA PESA - SUPABASE DATABASE SETUP
-- ============================================

-- 1. Add balance column to profiles table
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance NUMERIC(15,2) DEFAULT 10000.00;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

-- Update existing users with default balance (KSh 10,000)
UPDATE profiles 
SET balance = 10000.00 
WHERE balance IS NULL;

-- 2. Create or update transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  phone TEXT,
  till TEXT,
  paybill TEXT,
  account TEXT,
  agent TEXT,
  store TEXT,
  bank_code TEXT,
  status TEXT DEFAULT 'pending',
  voice_verified BOOLEAN DEFAULT false,
  confidence_score INTEGER,
  voice_command_text TEXT,
  mpesa_transaction_id TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Function to update user balance
-- ============================================
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_transaction_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_amount_change NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, create one with default balance
  IF v_current_balance IS NULL THEN
    INSERT INTO profiles (id, balance, created_at, updated_at)
    VALUES (p_user_id, 10000, NOW(), NOW())
    RETURNING balance INTO v_current_balance;
  END IF;
  
  -- Calculate balance change based on transaction type
  CASE p_transaction_type
    -- Deduct for outgoing transactions
    WHEN 'send_phone' THEN
      v_amount_change := -p_amount;
    WHEN 'buy_goods_pochi' THEN
      v_amount_change := -p_amount;
    WHEN 'buy_goods_till' THEN
      v_amount_change := -p_amount;
    WHEN 'paybill' THEN
      v_amount_change := -p_amount;
    WHEN 'withdraw' THEN
      v_amount_change := -p_amount;
    WHEN 'mpesa_to_bank' THEN
      v_amount_change := -p_amount;
    -- Add for incoming transactions
    WHEN 'bank_to_mpesa' THEN
      v_amount_change := p_amount;
    -- Default: deduct
    ELSE
      v_amount_change := -p_amount;
  END CASE;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + v_amount_change;
  
  -- Check if sufficient balance for deductions
  IF v_new_balance < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;
  
  -- Update balance
  UPDATE profiles
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount_changed', v_amount_change,
    'transaction_type', p_transaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get user balance
-- ============================================
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_balance NUMERIC;
  v_email TEXT;
  v_full_name TEXT;
BEGIN
  SELECT balance, email, full_name 
  INTO v_balance, v_email, v_full_name
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'full_name', v_full_name,
    'balance', v_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get transaction history
-- ============================================
CREATE OR REPLACE FUNCTION get_transaction_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  amount NUMERIC,
  phone TEXT,
  till TEXT,
  paybill TEXT,
  status TEXT,
  voice_command_text TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.type,
    t.amount,
    t.phone,
    t.till,
    t.paybill,
    t.status,
    t.voice_command_text,
    t.created_at
  FROM transactions t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Grant necessary permissions
-- ============================================
-- Allow service role to execute functions
GRANT EXECUTE ON FUNCTION update_user_balance(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_balance(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_history(UUID, INTEGER) TO service_role, authenticated;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Update n8n with your Supabase URL and service key
-- 3. Add the "Update User Balance" HTTP Request node in n8n
-- 4. Test with a voice command!
--
-- Test queries:
-- SELECT * FROM profiles WHERE email = 'your@email.com';
-- SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
-- SELECT get_user_balance('YOUR_USER_ID');
-- ============================================

-- ============================================
-- RLS POLICIES FOR TRANSACTIONS TABLE
-- ============================================
-- Run this in Supabase SQL Editor to fix n8n insert error

-- 1. Enable RLS (if not already enabled)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role full access" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON transactions;
DROP POLICY IF EXISTS "Allow all inserts for now" ON transactions;

-- 3. CRITICAL: Allow service role full access (for n8n)
-- This is what n8n needs to insert transactions
CREATE POLICY "Service role full access"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Allow authenticated users to insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Allow users to view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Allow users to update their own transactions (for cancellations)
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- ============================================
-- TEST INSERT (Should work now)
-- ============================================
-- This simulates what n8n is trying to do
-- Replace with your actual user_id

/*
INSERT INTO transactions (
  user_id,
  type,
  amount,
  phone,
  status,
  voice_verified,
  confidence_score,
  voice_command_text
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',  -- Replace with YOUR user_id
  'send_phone',
  5000.00,
  '254743854888',
  'pending',
  true,
  95,
  'Send 5000 to 0743854888'
);
*/

-- ============================================
-- CHECK YOUR TRANSACTIONS
-- ============================================
SELECT 
  id,
  user_id,
  type,
  amount,
  phone,
  status,
  voice_verified,
  voice_command_text,
  created_at
FROM transactions
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'  -- Replace with YOUR user_id
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- DONE!
-- ============================================
-- After running this, n8n should be able to insert transactions
-- Make sure n8n is using the SERVICE ROLE KEY (not anon key)

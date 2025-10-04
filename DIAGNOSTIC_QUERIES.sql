-- ============================================
-- DIAGNOSTIC QUERIES FOR ONGEA PESA
-- ============================================
-- Run these in Supabase SQL Editor to debug

-- 1. CHECK IF YOU HAVE USERS
-- ============================================
SELECT 
  'Total users' as check_name,
  COUNT(*) as count
FROM auth.users;

-- 2. CHECK YOUR USER PROFILE
-- ============================================
-- Replace 'YOUR_PHONE' with your actual phone number
SELECT 
  id,
  phone_number,
  mpesa_number,
  wallet_balance,
  created_at,
  updated_at
FROM profiles
WHERE phone_number = 'YOUR_PHONE' OR mpesa_number = 'YOUR_PHONE';

-- 3. CHECK VOICE SESSIONS
-- ============================================
SELECT 
  'Total voice sessions' as metric,
  COUNT(*) as count
FROM voice_sessions;

-- Recent sessions
SELECT 
  session_id,
  user_id,
  status,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_still_active,
  AGE(NOW(), created_at) as age
FROM voice_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Active sessions RIGHT NOW
SELECT 
  COUNT(*) as active_sessions_count
FROM voice_sessions
WHERE status = 'active'
  AND expires_at > NOW();

-- 4. CHECK TRANSACTIONS
-- ============================================
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN user_id = 'test-user-id' THEN 1 END) as test_transactions,
  COUNT(CASE WHEN user_id != 'test-user-id' THEN 1 END) as real_transactions
FROM transactions;

-- Recent transactions
SELECT 
  id,
  user_id,
  type,
  amount,
  phone,
  status,
  voice_command_text,
  created_at,
  CASE 
    WHEN user_id = 'test-user-id' THEN '⚠️ TEST'
    ELSE '✅ REAL'
  END as transaction_type
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 5. CHECK BALANCE HISTORY
-- ============================================
SELECT 
  COUNT(*) as balance_changes
FROM balance_history;

-- Recent balance changes
SELECT 
  bh.id,
  bh.previous_balance,
  bh.new_balance,
  bh.change_amount,
  bh.reason,
  bh.created_at,
  p.phone_number,
  p.wallet_balance as current_balance
FROM balance_history bh
JOIN profiles p ON bh.user_id = p.id
ORDER BY bh.created_at DESC
LIMIT 10;

-- 6. CHECK RLS POLICIES
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
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'transactions', 'voice_sessions', 'balance_history')
ORDER BY tablename, policyname;

-- 7. CHECK IF voice_sessions TABLE EXISTS AND HAS CORRECT STRUCTURE
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'voice_sessions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. CHECK IF YOU CAN INSERT INTO voice_sessions
-- ============================================
-- This will show if RLS is blocking inserts
-- Replace YOUR_USER_ID with your actual user ID from step 2
DO $$
DECLARE
  test_session_id TEXT := 'test-session-' || floor(random() * 1000000);
  test_user_id UUID := 'YOUR_USER_ID'; -- Replace this!
BEGIN
  INSERT INTO voice_sessions (
    user_id,
    session_id,
    agent_id,
    status,
    expires_at
  ) VALUES (
    test_user_id,
    test_session_id,
    'test-agent',
    'active',
    NOW() + INTERVAL '15 minutes'
  );
  
  RAISE NOTICE 'SUCCESS: Can insert into voice_sessions!';
  
  -- Clean up test record
  DELETE FROM voice_sessions WHERE session_id = test_session_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Cannot insert into voice_sessions: %', SQLERRM;
END $$;

-- 9. FIND YOUR USER ID BY EMAIL
-- ============================================
-- Replace 'your@email.com' with your actual email
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'your@email.com';

-- 10. COMPREHENSIVE USER + TRANSACTIONS VIEW
-- ============================================
-- Shows everything about a user
-- Replace 'YOUR_PHONE' with your phone number
SELECT 
  p.id as user_id,
  p.phone_number,
  p.wallet_balance,
  COUNT(DISTINCT t.id) as total_transactions,
  SUM(t.amount) as total_transaction_amount,
  COUNT(DISTINCT vs.id) as total_voice_sessions,
  COUNT(DISTINCT bh.id) as balance_changes,
  MAX(t.created_at) as last_transaction_time,
  MAX(vs.created_at) as last_voice_session_time
FROM profiles p
LEFT JOIN transactions t ON p.id = t.user_id
LEFT JOIN voice_sessions vs ON p.id = vs.user_id
LEFT JOIN balance_history bh ON p.id = bh.user_id
WHERE p.phone_number = 'YOUR_PHONE'
GROUP BY p.id, p.phone_number, p.wallet_balance;

-- ============================================
-- EXPECTED RESULTS FOR WORKING SYSTEM
-- ============================================
/*
1. Total users > 0
2. Your profile exists with wallet_balance (e.g., 10000.00)
3. Active voice sessions > 0 when voice interface is open
4. Real transactions > 0 (user_id != 'test-user-id')
5. Balance history records match transactions
6. RLS policies exist for all tables
7. voice_sessions table has correct structure
8. Can insert into voice_sessions (test passes)
9. Your user ID found by email
10. Comprehensive view shows data
*/

-- ============================================
-- QUICK FIX QUERIES
-- ============================================

-- Delete all test transactions
-- DELETE FROM transactions WHERE user_id = 'test-user-id';

-- Reset your balance to 10000
-- UPDATE profiles SET wallet_balance = 10000.00 WHERE phone_number = 'YOUR_PHONE';

-- Clear old expired voice sessions
-- DELETE FROM voice_sessions WHERE expires_at < NOW() - INTERVAL '1 day';

-- Make all old sessions inactive
-- UPDATE voice_sessions SET status = 'ended' WHERE expires_at < NOW();

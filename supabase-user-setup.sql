-- Supabase User ID Generation and Setup
-- Run this to create your user account in Ongea Pesa

-- Create your user account
INSERT INTO users (
  id,
  phone,
  name,
  balance,
  daily_limit,
  is_active
) VALUES (
  gen_random_uuid(), -- This will generate your unique user_id
  '254712345678', -- Replace with your actual phone number
  'Your Name Here', -- Replace with your actual name
  10000.00, -- Starting balance (KSh 10,000)
  50000.00, -- Daily limit (KSh 50,000)
  true
) RETURNING id, phone, name, balance;

-- Get your user_id after creation
SELECT 
  id as user_id,
  phone,
  name,
  balance,
  daily_limit,
  created_at
FROM users 
WHERE phone = '254712345678'; -- Replace with your phone number

-- Set up default transaction limits
INSERT INTO transaction_limits (
  user_id,
  limit_type,
  transaction_type,
  max_amount,
  max_count,
  is_active
) VALUES 
-- Daily limits per transaction type
((SELECT id FROM users WHERE phone = '254712345678'), 'daily', 'send_phone', 30000.00, 20, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'daily', 'buy_goods_till', 25000.00, 15, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'daily', 'paybill', 50000.00, 10, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'daily', 'withdraw', 20000.00, 5, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'daily', 'bank_to_mpesa', 100000.00, 3, true),

-- Per transaction limits
((SELECT id FROM users WHERE phone = '254712345678'), 'per_transaction', 'send_phone', 10000.00, NULL, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'per_transaction', 'buy_goods_till', 15000.00, NULL, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'per_transaction', 'paybill', 25000.00, NULL, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'per_transaction', 'withdraw', 10000.00, NULL, true),
((SELECT id FROM users WHERE phone = '254712345678'), 'per_transaction', 'bank_to_mpesa', 50000.00, NULL, true);

-- Create a test transaction to verify setup
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
  (SELECT id FROM users WHERE phone = '254712345678'),
  'send_phone',
  '1000',
  '254798765432',
  'completed',
  true,
  95,
  'Send 1000 to 0798765432'
) RETURNING id, type, amount, status, created_at;

-- Verify your setup
SELECT 
  u.id as user_id,
  u.phone,
  u.name,
  u.balance,
  COUNT(t.id) as total_transactions,
  COUNT(tl.id) as total_limits
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
LEFT JOIN transaction_limits tl ON u.id = tl.user_id
WHERE u.phone = '254712345678'
GROUP BY u.id, u.phone, u.name, u.balance;

-- Ongea Pesa Supabase Database Schema
-- Optimized for MCP server integration and voice transactions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and profiles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) UNIQUE NOT NULL, -- 254XXXXXXXXX format
  name VARCHAR(100),
  email VARCHAR(255),
  voice_profile JSONB, -- Store voice biometric data
  pin_hash VARCHAR(255), -- Encrypted PIN for fallback auth
  balance DECIMAL(12,2) DEFAULT 0.00,
  daily_limit DECIMAL(10,2) DEFAULT 100000.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table - main transaction log
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction core fields (matching VAPI JSON structure)
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'send_phone', 'buy_goods_pochi', 'buy_goods_till', 
    'paybill', 'withdraw', 'bank_to_mpesa', 'bank_to_bank'
  )),
  amount DECIMAL(10,2) NOT NULL,
  
  -- Destination fields (only relevant ones populated per transaction type)
  phone VARCHAR(15), -- For send_phone, buy_goods_pochi
  till VARCHAR(10), -- For buy_goods_till
  paybill VARCHAR(10), -- For paybill
  account VARCHAR(50), -- For paybill, bank transactions
  agent VARCHAR(10), -- For withdraw
  store VARCHAR(10), -- For withdraw
  bank_code VARCHAR(4), -- For bank transactions
  
  -- Transaction metadata
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  
  -- Voice and AI data
  voice_verified BOOLEAN DEFAULT false,
  confidence_score INTEGER, -- AI confidence percentage
  voice_command_text TEXT, -- Original voice command
  
  -- External references
  mpesa_transaction_id VARCHAR(50), -- M-Pesa confirmation code
  external_ref VARCHAR(100), -- Bank/provider reference
  
  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice sessions table for tracking VAPI interactions
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL, -- VAPI session ID
  
  -- Session data
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Voice quality metrics
  audio_quality_score INTEGER,
  voice_match_score INTEGER,
  background_noise_level VARCHAR(10),
  
  -- Session outcome
  transactions_completed INTEGER DEFAULT 0,
  total_amount_transacted DECIMAL(12,2) DEFAULT 0.00,
  session_status VARCHAR(20) DEFAULT 'active' CHECK (session_status IN (
    'active', 'completed', 'timeout', 'error'
  )),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI scan results table for document recognition
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Scan metadata
  scan_type VARCHAR(20) NOT NULL,
  image_url TEXT, -- Supabase storage URL for scanned image
  
  -- AI extraction results
  extracted_data JSONB NOT NULL, -- Raw AI response
  confidence_score INTEGER NOT NULL,
  processing_time_ms INTEGER,
  
  -- Gemini AI details
  model_used VARCHAR(50) DEFAULT 'gemini-2.5-pro',
  prompt_version VARCHAR(10),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction limits table for security
CREATE TABLE transaction_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Limit types
  limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN (
    'daily', 'weekly', 'monthly', 'per_transaction'
  )),
  transaction_type VARCHAR(20), -- NULL means applies to all types
  
  -- Limits
  max_amount DECIMAL(10,2) NOT NULL,
  max_count INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, limit_type, transaction_type)
);

-- Audit log for all database changes
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_phone ON transactions(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_transactions_till ON transactions(till) WHERE till IS NOT NULL;
CREATE INDEX idx_transactions_paybill ON transactions(paybill) WHERE paybill IS NOT NULL;

CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_session_id ON voice_sessions(session_id);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at DESC);

CREATE INDEX idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX idx_scan_results_transaction_id ON scan_results(transaction_id);
CREATE INDEX idx_scan_results_created_at ON scan_results(created_at DESC);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Voice sessions policies
CREATE POLICY "Users can view own voice sessions" ON voice_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own voice sessions" ON voice_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Scan results policies
CREATE POLICY "Users can view own scan results" ON scan_results
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own scan results" ON scan_results
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Transaction limits policies
CREATE POLICY "Users can view own limits" ON transaction_limits
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user transaction summary
CREATE OR REPLACE FUNCTION get_user_transaction_summary(user_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_transactions BIGINT,
  total_amount DECIMAL(12,2),
  successful_transactions BIGINT,
  failed_transactions BIGINT,
  most_used_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_transactions,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    MODE() WITHIN GROUP (ORDER BY type) as most_used_type
  FROM transactions 
  WHERE user_id = user_uuid 
    AND created_at >= NOW() - INTERVAL '%s days' % days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check transaction limits
CREATE OR REPLACE FUNCTION check_transaction_limit(
  user_uuid UUID, 
  trans_type VARCHAR(20), 
  trans_amount DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
DECLARE
  daily_total DECIMAL(10,2);
  daily_limit DECIMAL(10,2);
  per_transaction_limit DECIMAL(10,2);
BEGIN
  -- Get daily total for user
  SELECT COALESCE(SUM(amount), 0) INTO daily_total
  FROM transactions 
  WHERE user_id = user_uuid 
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('completed', 'processing');
  
  -- Get daily limit
  SELECT max_amount INTO daily_limit
  FROM transaction_limits
  WHERE user_id = user_uuid 
    AND limit_type = 'daily'
    AND (transaction_type IS NULL OR transaction_type = trans_type)
    AND is_active = true
  ORDER BY transaction_type NULLS LAST
  LIMIT 1;
  
  -- Get per transaction limit
  SELECT max_amount INTO per_transaction_limit
  FROM transaction_limits
  WHERE user_id = user_uuid 
    AND limit_type = 'per_transaction'
    AND (transaction_type IS NULL OR transaction_type = trans_type)
    AND is_active = true
  ORDER BY transaction_type NULLS LAST
  LIMIT 1;
  
  -- Check limits
  IF daily_limit IS NOT NULL AND (daily_total + trans_amount) > daily_limit THEN
    RETURN FALSE;
  END IF;
  
  IF per_transaction_limit IS NOT NULL AND trans_amount > per_transaction_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

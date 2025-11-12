-- Migration: Create users table
-- Description: Base users table for Ongea Pesa application

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT '',
  name VARCHAR(255) DEFAULT '',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  daily_limit DECIMAL(15, 2) DEFAULT 100000.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE users IS 'Core users table for Ongea Pesa - stores user profile and balance information';
COMMENT ON COLUMN users.id IS 'User UUID from auth.users';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.name IS 'User display name';
COMMENT ON COLUMN users.balance IS 'Current wallet balance in KES';
COMMENT ON COLUMN users.daily_limit IS 'Daily transaction limit in KES';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp';

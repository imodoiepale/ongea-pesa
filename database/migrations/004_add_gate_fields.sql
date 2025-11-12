-- Migration: Add gate_id and gate_name to users table
-- Description: Store payment gateway information for each user

-- Add gate_id and gate_name columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gate_id INTEGER,
ADD COLUMN IF NOT EXISTS gate_name VARCHAR(255);

-- Create index for gate_id lookups
CREATE INDEX IF NOT EXISTS idx_users_gate_id ON public.users(gate_id);

-- Add comment to document the fields
COMMENT ON COLUMN public.users.gate_id IS 'Payment gateway ID from external payment provider';
COMMENT ON COLUMN public.users.gate_name IS 'Payment gateway name derived from user email';

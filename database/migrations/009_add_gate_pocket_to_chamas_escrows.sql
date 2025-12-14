-- Migration: Add Gate and Pocket integration to Chamas and Escrows
-- Description: Each Chama and Escrow gets its own IndexPay Gate and Pocket for fund management
-- Date: 2024-12-14

-- ============================================
-- CHAMAS TABLE UPDATES
-- ============================================

-- Add gate and pocket fields to chamas table
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS gate_id TEXT;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS gate_name TEXT;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS pocket_id TEXT;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS pocket_name TEXT;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS gate_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS pocket_balance DECIMAL(15,2) DEFAULT 0;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chamas_gate_id ON chamas(gate_id);
CREATE INDEX IF NOT EXISTS idx_chamas_gate_name ON chamas(gate_name);

-- ============================================
-- ESCROWS TABLE UPDATES
-- ============================================

-- Add gate and pocket fields to escrows table
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS gate_id TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS gate_name TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS pocket_id TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS pocket_name TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS gate_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS pocket_balance DECIMAL(15,2) DEFAULT 0;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_escrows_gate_id ON escrows(gate_id);
CREATE INDEX IF NOT EXISTS idx_escrows_gate_name ON escrows(gate_name);

-- ============================================
-- GATE TRANSACTION LOGS
-- ============================================

-- Table to track all gate/pocket transactions for chamas and escrows
CREATE TABLE IF NOT EXISTS gate_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chama', 'escrow')),
  entity_id UUID NOT NULL,
  gate_id TEXT,
  gate_name TEXT,
  pocket_id TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'stk_push', 'payout')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reference TEXT,
  mpesa_receipt TEXT,
  phone_number TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gate_transactions
CREATE INDEX IF NOT EXISTS idx_gate_transactions_entity ON gate_transactions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gate_transactions_gate ON gate_transactions(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_transactions_status ON gate_transactions(status);
CREATE INDEX IF NOT EXISTS idx_gate_transactions_created ON gate_transactions(created_at);

-- ============================================
-- MEMBER CONTRIBUTIONS TRACKING
-- ============================================

-- Enhanced tracking for member contributions with gate integration
ALTER TABLE chama_members ADD COLUMN IF NOT EXISTS last_contribution_date TIMESTAMPTZ;
ALTER TABLE chama_members ADD COLUMN IF NOT EXISTS contribution_count INTEGER DEFAULT 0;
ALTER TABLE chama_members ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(15,2) DEFAULT 0;

-- ============================================
-- ESCROW PARTICIPANT FUNDING TRACKING
-- ============================================

ALTER TABLE escrow_participants ADD COLUMN IF NOT EXISTS funded_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE escrow_participants ADD COLUMN IF NOT EXISTS last_funded_date TIMESTAMPTZ;
ALTER TABLE escrow_participants ADD COLUMN IF NOT EXISTS funding_count INTEGER DEFAULT 0;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update chama gate balance
CREATE OR REPLACE FUNCTION update_chama_gate_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type = 'chama' AND NEW.status = 'completed' THEN
    IF NEW.transaction_type IN ('deposit', 'stk_push') THEN
      UPDATE chamas 
      SET gate_balance = gate_balance + NEW.amount,
          total_collected = total_collected + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.entity_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'payout') THEN
      UPDATE chamas 
      SET gate_balance = gate_balance - NEW.amount,
          total_distributed = total_distributed + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update escrow gate balance
CREATE OR REPLACE FUNCTION update_escrow_gate_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type = 'escrow' AND NEW.status = 'completed' THEN
    IF NEW.transaction_type IN ('deposit', 'stk_push') THEN
      UPDATE escrows 
      SET gate_balance = gate_balance + NEW.amount,
          funded_amount = funded_amount + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.entity_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'payout') THEN
      UPDATE escrows 
      SET gate_balance = gate_balance - NEW.amount,
          released_amount = released_amount + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic balance updates
DROP TRIGGER IF EXISTS trigger_update_chama_balance ON gate_transactions;
CREATE TRIGGER trigger_update_chama_balance
  AFTER INSERT OR UPDATE ON gate_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_chama_gate_balance();

DROP TRIGGER IF EXISTS trigger_update_escrow_balance ON gate_transactions;
CREATE TRIGGER trigger_update_escrow_balance
  AFTER INSERT OR UPDATE ON gate_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_gate_balance();

-- Function to update member contribution when STK push completes
CREATE OR REPLACE FUNCTION update_member_contribution()
RETURNS TRIGGER AS $$
DECLARE
  member_id UUID;
BEGIN
  IF NEW.entity_type = 'chama' AND NEW.status = 'completed' AND NEW.transaction_type = 'stk_push' THEN
    -- Find the member by phone number
    SELECT id INTO member_id
    FROM chama_members
    WHERE chama_id = NEW.entity_id AND phone_number = NEW.phone_number
    LIMIT 1;
    
    IF member_id IS NOT NULL THEN
      UPDATE chama_members
      SET total_contributed = total_contributed + NEW.amount,
          contribution_count = contribution_count + 1,
          last_contribution_date = NOW(),
          pending_amount = GREATEST(0, pending_amount - NEW.amount),
          updated_at = NOW()
      WHERE id = member_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_contribution ON gate_transactions;
CREATE TRIGGER trigger_update_member_contribution
  AFTER INSERT OR UPDATE ON gate_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_member_contribution();

-- Function to update escrow participant funding when deposit completes
CREATE OR REPLACE FUNCTION update_participant_funding()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
BEGIN
  IF NEW.entity_type = 'escrow' AND NEW.status = 'completed' AND NEW.transaction_type IN ('deposit', 'stk_push') THEN
    -- Find the participant by phone number
    SELECT id INTO participant_id
    FROM escrow_participants
    WHERE escrow_id = NEW.entity_id AND phone_number = NEW.phone_number
    LIMIT 1;
    
    IF participant_id IS NOT NULL THEN
      UPDATE escrow_participants
      SET funded_amount = funded_amount + NEW.amount,
          funding_count = funding_count + 1,
          last_funded_date = NOW(),
          updated_at = NOW()
      WHERE id = participant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_participant_funding ON gate_transactions;
CREATE TRIGGER trigger_update_participant_funding
  AFTER INSERT OR UPDATE ON gate_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_funding();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE gate_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transactions for entities they're part of
CREATE POLICY "Users can view related gate transactions" ON gate_transactions
  FOR SELECT
  USING (
    (entity_type = 'chama' AND entity_id IN (
      SELECT chama_id FROM chama_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM chamas WHERE creator_id = auth.uid()
    ))
    OR
    (entity_type = 'escrow' AND entity_id IN (
      SELECT escrow_id FROM escrow_participants WHERE user_id = auth.uid()
      UNION
      SELECT id FROM escrows WHERE creator_id = auth.uid()
    ))
  );

-- Policy: System can insert transactions (via service role)
CREATE POLICY "Service can insert gate transactions" ON gate_transactions
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update transactions (via service role)
CREATE POLICY "Service can update gate transactions" ON gate_transactions
  FOR UPDATE
  USING (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN chamas.gate_id IS 'IndexPay Gate ID for this chama';
COMMENT ON COLUMN chamas.gate_name IS 'IndexPay Gate name for this chama';
COMMENT ON COLUMN chamas.pocket_id IS 'IndexPay Pocket ID for this chama';
COMMENT ON COLUMN chamas.pocket_name IS 'IndexPay Pocket name within the gate';
COMMENT ON COLUMN chamas.gate_balance IS 'Current balance in the gate (auto-updated)';
COMMENT ON COLUMN chamas.pocket_balance IS 'Current balance in the pocket (auto-updated)';

COMMENT ON COLUMN escrows.gate_id IS 'IndexPay Gate ID for this escrow';
COMMENT ON COLUMN escrows.gate_name IS 'IndexPay Gate name for this escrow';
COMMENT ON COLUMN escrows.pocket_id IS 'IndexPay Pocket ID for this escrow';
COMMENT ON COLUMN escrows.pocket_name IS 'IndexPay Pocket name within the gate';
COMMENT ON COLUMN escrows.gate_balance IS 'Current balance in the gate (auto-updated)';
COMMENT ON COLUMN escrows.pocket_balance IS 'Current balance in the pocket (auto-updated)';

COMMENT ON TABLE gate_transactions IS 'Tracks all IndexPay gate/pocket transactions for chamas and escrows';

-- Migration 012: Add payment provider tracking columns
-- Supports NCBA Open Banking and Safaricom Daraja 3.0 B2C integration

-- chama_payouts: track Daraja B2C async conversation IDs
ALTER TABLE public.chama_payouts
  ADD COLUMN IF NOT EXISTS conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'safaricom_b2c';

-- transactions: index on provider_ref for fast callback lookups
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_ref
  ON public.transactions (provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chama_payouts_conversation_id
  ON public.chama_payouts (conversation_id)
  WHERE conversation_id IS NOT NULL;

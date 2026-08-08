-- Extend the test/live label to the remaining money-record tables.
-- transactions and voice_sessions were done in 20260807110000_environment_labelling;
-- these are the other tables that hold records of money having moved.

ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';
ALTER TABLE public.mpesa_transactions
  DROP CONSTRAINT IF EXISTS mpesa_transactions_environment_check;
ALTER TABLE public.mpesa_transactions
  ADD CONSTRAINT mpesa_transactions_environment_check
  CHECK (environment = ANY (ARRAY['test','live']));

ALTER TABLE public.gate_transactions
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';
ALTER TABLE public.gate_transactions
  DROP CONSTRAINT IF EXISTS gate_transactions_environment_check;
ALTER TABLE public.gate_transactions
  ADD CONSTRAINT gate_transactions_environment_check
  CHECK (environment = ANY (ARRAY['test','live']));

-- Same cutover boundary as the first labelling migration, so re-running cannot
-- relabel anything legitimately written as live afterwards.
UPDATE public.mpesa_transactions
SET environment = 'test'
WHERE created_at < '2026-08-07T00:00:00Z' AND environment <> 'test';

UPDATE public.gate_transactions
SET environment = 'test'
WHERE created_at < '2026-08-07T00:00:00Z' AND environment <> 'test';

CREATE INDEX IF NOT EXISTS idx_mpesa_tx_env_created
  ON public.mpesa_transactions(environment, created_at DESC);

COMMENT ON COLUMN public.mpesa_transactions.environment IS
  'test = pre-cutover or sandbox activity; live = real production money.';
COMMENT ON COLUMN public.gate_transactions.environment IS
  'test = pre-cutover or sandbox activity; live = real production money.';

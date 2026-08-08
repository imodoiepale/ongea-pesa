-- Test/live separation.
--
-- Everything recorded up to now was development and pilot activity against real
-- rails. It is relabelled 'test' so a clean 'live' baseline starts from here,
-- rather than deleting it: 26 real accounts, 23 email-confirmed and 11 active in
-- the last 90 days, plus 25 chamas and a 462-row audit trail, all sit behind
-- that history. Wiping it would destroy the record of real money having moved.
--
-- The default is deliberately 'live'. A missing ONGEA_ENVIRONMENT must never
-- silently mark real money as test — the failure mode of the safe-looking
-- default ('test') is invisible under-reporting of actual revenue.
--
-- Wallet balances are zeroed as requested, but every pre-zero value is written
-- to balance_history first, so the state is reconstructible.
--
-- Apply: paste into Supabase SQL editor -> Run. Idempotent.

-- ── Columns ───────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_environment_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_environment_check
  CHECK (environment = ANY (ARRAY['test','live']));

ALTER TABLE public.voice_sessions
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';
ALTER TABLE public.voice_sessions
  DROP CONSTRAINT IF EXISTS voice_sessions_environment_check;
ALTER TABLE public.voice_sessions
  ADD CONSTRAINT voice_sessions_environment_check
  CHECK (environment = ANY (ARRAY['test','live']));

-- ── Backfill everything that already exists to 'test' ─────────────────────────
-- Bounded by created_at so re-running the migration later cannot relabel rows
-- that were legitimately written as 'live' after the cutover.

UPDATE public.transactions
SET environment = 'test'
WHERE created_at < '2026-08-07T00:00:00Z' AND environment <> 'test';

UPDATE public.voice_sessions
SET environment = 'test'
WHERE created_at < '2026-08-07T00:00:00Z' AND environment <> 'test';

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Live reporting is the hot path and must never scan the test backlog.

CREATE INDEX IF NOT EXISTS idx_transactions_env_created
  ON public.transactions(environment, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_env_created
  ON public.voice_sessions(environment, created_at DESC);

-- ── Zero the wallet balances, preserving the prior state ──────────────────────

INSERT INTO public.balance_history (user_id, previous_balance, new_balance, change_amount, reason)
SELECT id, wallet_balance, 0, -wallet_balance,
       'Reset to zero at test/live cutover 2026-08-07; prior balance was test-environment activity'
FROM public.profiles
WHERE COALESCE(wallet_balance, 0) <> 0;

UPDATE public.profiles
SET wallet_balance = 0, updated_at = now()
WHERE COALESCE(wallet_balance, 0) <> 0;

COMMENT ON COLUMN public.transactions.environment IS
  'test = pre-cutover or sandbox activity; live = real production money. Defaults to live so a missing ONGEA_ENVIRONMENT cannot hide real revenue.';
COMMENT ON COLUMN public.voice_sessions.environment IS
  'test = pre-cutover or sandbox activity; live = real production session.';

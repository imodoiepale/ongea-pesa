-- Migration 019 — user_pockets table
-- Per-user pocket ledger: tracks deposited amounts explicitly,
-- separate from profiles.wallet_balance (which holds spendable total).
--
-- Apply: paste into Supabase SQL editor → Run.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS and DROP TRIGGER IF EXISTS guards.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_pockets (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pocket_name      TEXT        NOT NULL DEFAULT 'ongeapesa_wallet',
  balance          NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited  NUMERIC     NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'KES',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_pockets_user_id ON public.user_pockets(user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

-- Re-use the set_updated_at function defined in migration 017 (idempotent).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_pockets_updated_at'
  ) THEN
    CREATE TRIGGER user_pockets_updated_at
      BEFORE UPDATE ON public.user_pockets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.user_pockets ENABLE ROW LEVEL SECURITY;

-- Owner can read their own pocket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pockets' AND policyname = 'user_pockets_owner_select'
  ) THEN
    CREATE POLICY user_pockets_owner_select ON public.user_pockets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can do everything (for callbacks + admin)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pockets' AND policyname = 'user_pockets_service_all'
  ) THEN
    CREATE POLICY user_pockets_service_all ON public.user_pockets
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── Auto-create pocket when a new profile is inserted ─────────────────────────
-- Fires on public.profiles INSERT (which is how new users land in the system).

CREATE OR REPLACE FUNCTION public.create_pocket_for_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_pockets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profile_create_user_pocket'
  ) THEN
    CREATE TRIGGER profile_create_user_pocket
      AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.create_pocket_for_new_profile();
  END IF;
END $$;

-- ── Balance trigger: mirrors update_wallet_balance logic ──────────────────────
-- Credits/debits pocket on the SAME events that credit profiles.wallet_balance.

CREATE OR REPLACE FUNCTION public.update_user_pocket_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  credit_types TEXT[] := ARRAY['deposit', 'receive'];
  balance_change NUMERIC := 0;
BEGIN
  -- Determine direction
  IF NEW.type = ANY(credit_types) THEN
    balance_change := NEW.amount;
  ELSE
    balance_change := -NEW.amount;
  END IF;

  -- Upsert: create pocket if it doesn't exist yet, then update
  INSERT INTO public.user_pockets (user_id, balance, total_deposited)
  VALUES (
    NEW.user_id,
    GREATEST(0, balance_change),
    CASE WHEN balance_change > 0 THEN balance_change ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(0, public.user_pockets.balance + balance_change),
    total_deposited = CASE
      WHEN balance_change > 0
        THEN public.user_pockets.total_deposited + balance_change
      ELSE public.user_pockets.total_deposited
    END,
    updated_at = now();

  RETURN NEW;
END $$;

-- INSERT trigger: fires when a transaction is inserted already-completed
DROP TRIGGER IF EXISTS trigger_update_user_pocket_on_insert ON public.transactions;
CREATE TRIGGER trigger_update_user_pocket_on_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_user_pocket_balance();

-- UPDATE trigger: fires when status flips to completed
DROP TRIGGER IF EXISTS trigger_update_user_pocket_on_update ON public.transactions;
CREATE TRIGGER trigger_update_user_pocket_on_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION public.update_user_pocket_balance();

-- ── Backfill: create pockets for all existing users from completed txns ────────

INSERT INTO public.user_pockets (user_id, balance, total_deposited)
SELECT
  t.user_id,
  GREATEST(0,
    COALESCE(SUM(
      CASE WHEN t.type IN ('deposit', 'receive') THEN t.amount ELSE -t.amount END
    ), 0)
  ) AS balance,
  COALESCE(SUM(
    CASE WHEN t.type IN ('deposit', 'receive') THEN t.amount ELSE 0 END
  ), 0) AS total_deposited
FROM public.transactions t
WHERE t.status = 'completed'
GROUP BY t.user_id
ON CONFLICT (user_id) DO UPDATE SET
  balance         = EXCLUDED.balance,
  total_deposited = EXCLUDED.total_deposited,
  updated_at      = now();

-- Also ensure every existing profile has at least a zero pocket
INSERT INTO public.user_pockets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.user_pockets IS 'Per-user pocket ledger: mirrors wallet_balance logic, tracks total deposited separately';
COMMENT ON COLUMN public.user_pockets.balance IS 'Running net balance (mirrors profiles.wallet_balance logic)';
COMMENT ON COLUMN public.user_pockets.total_deposited IS 'Cumulative amount deposited (credits only); never decremented';

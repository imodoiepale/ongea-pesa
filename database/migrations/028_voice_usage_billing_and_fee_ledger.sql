-- Bill voice sessions and make the canonical wallet ledger include saved platform fees.

ALTER TABLE public.voice_sessions
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS billed_minutes numeric(12,4),
  ADD COLUMN IF NOT EXISTS rate_per_minute numeric(12,2),
  ADD COLUMN IF NOT EXISTS usage_transaction_id uuid REFERENCES public.transactions(id),
  ADD COLUMN IF NOT EXISTS billing_error text;

CREATE UNIQUE INDEX IF NOT EXISTS voice_sessions_usage_transaction_unique
  ON public.voice_sessions (usage_transaction_id)
  WHERE usage_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  balance_change numeric;
  credit_types text[] := ARRAY['deposit', 'receive'];
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.type = ANY(credit_types) THEN
      balance_change := NEW.amount;
    ELSE
      balance_change := -(NEW.amount + COALESCE(NEW.platform_fee, 0));
    END IF;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + balance_change,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  balance_change numeric;
  credit_types text[] := ARRAY['deposit', 'receive'];
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    IF NEW.type = ANY(credit_types) THEN
      balance_change := NEW.amount;
    ELSE
      balance_change := -(NEW.amount + COALESCE(NEW.platform_fee, 0));
    END IF;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + balance_change,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.voice_sessions.rate_per_minute IS
  'Voice service price disclosed to the customer and used for this session.';

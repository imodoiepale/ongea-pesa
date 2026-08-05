-- Reconcile a completed transaction when the final NCBA cost arrives after the
-- payment status. Only the difference between the old and new ledger effect is
-- applied, making repeated identical updates idempotent.

CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance_change numeric := 0;
  old_effect numeric := 0;
  new_effect numeric := 0;
  old_provider_cost numeric := 0;
  new_provider_cost numeric := 0;
  credit_types text[] := ARRAY['deposit', 'receive'];
BEGIN
  IF COALESCE(OLD.metadata ->> 'cost_bearer', '') = 'customer' THEN
    old_provider_cost := COALESCE(OLD.transaction_cost, 0);
  END IF;
  IF COALESCE(NEW.metadata ->> 'cost_bearer', '') = 'customer' THEN
    new_provider_cost := COALESCE(NEW.transaction_cost, 0);
  END IF;

  IF OLD.type = ANY(credit_types) THEN
    old_effect := OLD.amount;
  ELSE
    old_effect := -(OLD.amount + COALESCE(OLD.platform_fee, 0) + old_provider_cost);
  END IF;

  IF NEW.type = ANY(credit_types) THEN
    new_effect := NEW.amount;
  ELSE
    new_effect := -(NEW.amount + COALESCE(NEW.platform_fee, 0) + new_provider_cost);
  END IF;

  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    balance_change := new_effect;
  ELSIF OLD.status = 'completed' AND NEW.status = 'completed' THEN
    balance_change := new_effect - old_effect;
  END IF;

  IF balance_change <> 0 THEN
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + balance_change,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.update_wallet_balance_on_status_change() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.update_wallet_balance_on_status_change() IS
  'Applies completion and post-completion fee reconciliation deltas to the canonical wallet balance.';

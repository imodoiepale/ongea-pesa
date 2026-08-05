-- Charge customer-borne provider costs as part of the canonical wallet debit.
-- Components remain separate for reconciliation; the product UI presents their
-- sum as one "Transaction cost".

CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance_change numeric;
  customer_provider_cost numeric := 0;
  credit_types text[] := ARRAY['deposit', 'receive'];
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.type = ANY(credit_types) THEN
      balance_change := NEW.amount;
    ELSE
      IF COALESCE(NEW.metadata ->> 'cost_bearer', '') = 'customer' THEN
        customer_provider_cost := COALESCE(NEW.transaction_cost, 0);
      END IF;
      balance_change := -(
        NEW.amount
        + COALESCE(NEW.platform_fee, 0)
        + customer_provider_cost
      );
    END IF;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + balance_change,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance_change numeric;
  customer_provider_cost numeric := 0;
  credit_types text[] := ARRAY['deposit', 'receive'];
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    IF NEW.type = ANY(credit_types) THEN
      balance_change := NEW.amount;
    ELSE
      IF COALESCE(NEW.metadata ->> 'cost_bearer', '') = 'customer' THEN
        customer_provider_cost := COALESCE(NEW.transaction_cost, 0);
      END IF;
      balance_change := -(
        NEW.amount
        + COALESCE(NEW.platform_fee, 0)
        + customer_provider_cost
      );
    END IF;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + balance_change,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END
$$;

-- Trigger functions are internal and should not be callable through PostgREST.
REVOKE EXECUTE ON FUNCTION public.update_wallet_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_wallet_balance_on_status_change() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.update_wallet_balance() IS
  'Credits completed deposits/receipts and debits completed sends including customer-borne provider cost.';
COMMENT ON FUNCTION public.update_wallet_balance_on_status_change() IS
  'Applies the canonical wallet delta when a transaction first becomes completed.';

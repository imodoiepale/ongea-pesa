-- Migration 013: Security events + activate audit logging
-- Part of Workstream A (world-class security). Safe to run multiple times.
--
-- Adds:
--   1. security_events  — application-level security/activity trail
--   2. audit_log        — row-change trail (created if missing)
--   3. audit_row_change() trigger fn + triggers on profiles/transactions/chama_payouts

-- 1. Application security event trail -----------------------------------------
CREATE TABLE IF NOT EXISTS public.security_events (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type   text NOT NULL,           -- login, logout, pin_failed, locked, passkey_enrolled, voice_session, money_sent, ...
  severity     text NOT NULL DEFAULT 'info' CHECK (severity = ANY (ARRAY['info','warning','critical'])),
  ip           text,
  user_agent   text,
  device_id    text,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type    ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events (created_at DESC);

-- 2. Row-change audit trail ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name  text NOT NULL,
  record_id   text,
  action      text NOT NULL CHECK (action = ANY (ARRAY['INSERT','UPDATE','DELETE'])),
  old_values  jsonb,
  new_values  jsonb,
  changed_by  uuid,
  changed_at  timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table  ON public.audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_when   ON public.audit_log (changed_at DESC);

-- 3. Generic audit trigger ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_record_id text;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_record_id := COALESCE(
    (CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END),
    NULL
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', to_jsonb(NEW), v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_actor);
    RETURN NEW;
  ELSE
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), v_actor);
    RETURN OLD;
  END IF;
END;
$$;

-- Attach to sensitive tables (idempotent) -------------------------------------
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'chama_payouts') THEN
    DROP TRIGGER IF EXISTS audit_chama_payouts ON public.chama_payouts;
    CREATE TRIGGER audit_chama_payouts
      AFTER INSERT OR UPDATE OR DELETE ON public.chama_payouts
      FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  END IF;
END$$;

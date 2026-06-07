-- Migration 020 — dependants table
-- Dependants: friends/family whose M-Pesa number can be used to top up the owner's wallet.
-- The STK push targets the dependant's phone, but the transaction user_id = owner,
-- so the owner's wallet (and pocket) is credited automatically via existing triggers.
--
-- Apply: paste into Supabase SQL editor → Run.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS and IF NOT EXISTS guards on policies/indexes.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dependants (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT        NOT NULL,
  phone              TEXT        NOT NULL,              -- raw as entered (07xx...)
  normalized_phone   TEXT        NOT NULL,              -- E.164 without + (254xx...)
  relationship       TEXT,                              -- e.g. 'parent', 'sibling', 'friend'
  total_contributed  NUMERIC     NOT NULL DEFAULT 0,    -- incremented when their STK completes
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, normalized_phone)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Fast lookup by phone (used in callback to increment total_contributed)
CREATE INDEX IF NOT EXISTS idx_dependants_user_phone
  ON public.dependants(user_id, normalized_phone);

-- Search by name
CREATE INDEX IF NOT EXISTS idx_dependants_display_name
  ON public.dependants(user_id, lower(display_name));

-- ── updated_at trigger ────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'dependants_updated_at'
  ) THEN
    CREATE TRIGGER dependants_updated_at
      BEFORE UPDATE ON public.dependants
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.dependants ENABLE ROW LEVEL SECURITY;

-- Owner: SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dependants' AND policyname = 'dependants_owner_select'
  ) THEN
    CREATE POLICY dependants_owner_select ON public.dependants
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Owner: INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dependants' AND policyname = 'dependants_owner_insert'
  ) THEN
    CREATE POLICY dependants_owner_insert ON public.dependants
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Owner: UPDATE (for total_contributed via PATCH)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dependants' AND policyname = 'dependants_owner_update'
  ) THEN
    CREATE POLICY dependants_owner_update ON public.dependants
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Owner: DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dependants' AND policyname = 'dependants_owner_delete'
  ) THEN
    CREATE POLICY dependants_owner_delete ON public.dependants
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role: full access (for callback + admin)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dependants' AND policyname = 'dependants_service_all'
  ) THEN
    CREATE POLICY dependants_service_all ON public.dependants
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMENT ON TABLE public.dependants IS 'Friends/family who can top up the owner wallet via STK push to their phone';
COMMENT ON COLUMN public.dependants.phone IS 'Raw phone as entered by the user (display format)';
COMMENT ON COLUMN public.dependants.normalized_phone IS 'Canonical E.164 without plus: 254XXXXXXXXX';
COMMENT ON COLUMN public.dependants.total_contributed IS 'Running total of completed STK top-ups initiated by this dependant';

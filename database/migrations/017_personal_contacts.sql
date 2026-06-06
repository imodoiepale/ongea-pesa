-- Migration 017 — personal_contacts table
-- Stores contacts imported from the user's device or uploaded from a vCard/CSV file.
-- Distinct from the legacy `contacts` table to avoid schema collision.
--
-- Apply: paste into Supabase SQL editor → Run.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.personal_contacts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text        NOT NULL,
  phone            text        NOT NULL,                 -- display format: 07XXXXXXXX
  normalized_phone text        NOT NULL,                 -- canonical: 254XXXXXXXXX
  source           text        NOT NULL DEFAULT 'manual', -- 'device' | 'vcard' | 'csv' | 'manual'
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicates per user per number
CREATE UNIQUE INDEX IF NOT EXISTS personal_contacts_user_phone_uq
  ON public.personal_contacts(user_id, normalized_phone);

-- Search index on name
CREATE INDEX IF NOT EXISTS personal_contacts_display_name_idx
  ON public.personal_contacts(user_id, lower(display_name));

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.personal_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: owner only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'personal_contacts' AND policyname = 'pc_select_own'
  ) THEN
    CREATE POLICY pc_select_own ON public.personal_contacts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- INSERT: owner only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'personal_contacts' AND policyname = 'pc_insert_own'
  ) THEN
    CREATE POLICY pc_insert_own ON public.personal_contacts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- UPDATE: owner only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'personal_contacts' AND policyname = 'pc_update_own'
  ) THEN
    CREATE POLICY pc_update_own ON public.personal_contacts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- DELETE: owner only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'personal_contacts' AND policyname = 'pc_delete_own'
  ) THEN
    CREATE POLICY pc_delete_own ON public.personal_contacts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'personal_contacts_updated_at'
  ) THEN
    CREATE TRIGGER personal_contacts_updated_at
      BEFORE UPDATE ON public.personal_contacts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

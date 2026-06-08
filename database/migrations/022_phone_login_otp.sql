-- Migration 022 — phone login OTP: otp_codes table + profile columns
-- Adds the infrastructure for email OTP verification during phone-number login
-- and for the one-time phone-verification setup flow.
--
-- What this migration does:
--   1. Three new columns on public.profiles:
--      - email_otp_enabled  — whether email OTP is required on phone login (default on)
--      - phone_verified     — true once the user has confirmed their phone via OTP setup
--      - pin_set_at         — timestamp when the PIN was last set (nullable)
--   2. New public.otp_codes table — stores bcrypt-hashed OTP codes (never plaintext)
--   3. Index on otp_codes(user_id, purpose, created_at DESC) for fast active-OTP lookup
--   4. RLS on otp_codes: service-role ONLY.  No owner/anon policies are created
--      intentionally — clients must never access this table directly; all OTP
--      generation and validation goes through server-side API routes.
--
-- Apply: paste into Supabase SQL editor → Run, OR `supabase db push`.
-- Idempotent: uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS and
--             DO $$ ... IF NOT EXISTS $$ guards on all policies/indexes.

-- ── Profile columns ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_otp_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_set_at         TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.email_otp_enabled IS 'When true, email OTP is required in addition to phone number on login';
COMMENT ON COLUMN public.profiles.phone_verified     IS 'True once the user has verified their phone number via the email OTP setup flow';
COMMENT ON COLUMN public.profiles.pin_set_at         IS 'Timestamp when the account PIN was last set; null if no PIN has been set yet';

-- ── otp_codes table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,               -- destination address (account email), for audit
  code_hash    TEXT        NOT NULL,               -- bcrypt(code) — NEVER store plaintext
  purpose      TEXT        NOT NULL CHECK (purpose = ANY (ARRAY['login', 'phone_setup'])),
  attempts     INTEGER     NOT NULL DEFAULT 0,
  max_attempts INTEGER     NOT NULL DEFAULT 5,
  consumed     BOOLEAN     NOT NULL DEFAULT false,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.otp_codes              IS 'Short-lived email OTP records for phone login and phone setup. Service-role access only; clients must never query this table directly.';
COMMENT ON COLUMN public.otp_codes.code_hash    IS 'bcrypt hash of the OTP — plaintext is never persisted';
COMMENT ON COLUMN public.otp_codes.purpose      IS 'login = phone-number login gate; phone_setup = one-time phone verification flow';
COMMENT ON COLUMN public.otp_codes.attempts     IS 'Number of failed verification attempts so far';
COMMENT ON COLUMN public.otp_codes.max_attempts IS 'Maximum allowed attempts before the code is invalidated (default 5)';
COMMENT ON COLUMN public.otp_codes.consumed     IS 'True once the code has been successfully verified and used';

-- ── Indexes ────────────────────────────────────────────────────────────────────

-- Fast lookup: find the latest active code for a user + purpose
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_purpose
  ON public.otp_codes(user_id, purpose, created_at DESC);

-- ── Row-Level Security — service-role ONLY ─────────────────────────────────────
-- Intentionally no owner/anon SELECT, INSERT, UPDATE, or DELETE policies.
-- All OTP logic runs in server-side API routes via the service-role client.

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role: full access (generate, verify, expire, audit)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'otp_codes' AND policyname = 'otp_codes_service_all'
  ) THEN
    CREATE POLICY otp_codes_service_all ON public.otp_codes
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

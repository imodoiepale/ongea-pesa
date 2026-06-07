-- ============================================================================
-- Migration 022: Voice Biometrics & WebAuthn Modality
-- ============================================================================
-- Purpose:
--   1. Add `modality` display-label column to webauthn_credentials (face/fingerprint).
--   2. Widen three CHECK constraints to allow 'voice':
--      - stepup_tokens.method
--      - auth_attempts.type
--      - webauthn_challenges.purpose
--   3. Create voice_biometric_profiles table with AES-256-GCM encrypted voiceprint
--      storage, consent tracking, and RLS (owner SELECT only; writes via service role).
--
-- Safe to run multiple times (fully idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. webauthn_credentials.modality — user-asserted display label
--    Values: 'face' | 'fingerprint' | 'platform' | 'cross-platform'
--    No enforcement CHECK (user-asserted display; WebAuthn device-type is the real source of truth).
-- ----------------------------------------------------------------------------
ALTER TABLE public.webauthn_credentials
  ADD COLUMN IF NOT EXISTS modality text;

-- ----------------------------------------------------------------------------
-- 2. Widen CHECK constraints to include 'voice'
-- ----------------------------------------------------------------------------

-- stepup_tokens.method: 'pin' | 'passkey'  →  'pin' | 'passkey' | 'voice'
ALTER TABLE public.stepup_tokens
  DROP CONSTRAINT IF EXISTS stepup_tokens_method_check;
ALTER TABLE public.stepup_tokens
  ADD CONSTRAINT stepup_tokens_method_check
  CHECK (method = ANY (ARRAY['pin'::text, 'passkey'::text, 'voice'::text]));

-- auth_attempts.type: 'pin' | 'passkey' | 'login' | 'stepup'  →  + 'voice'
ALTER TABLE public.auth_attempts
  DROP CONSTRAINT IF EXISTS auth_attempts_type_check;
ALTER TABLE public.auth_attempts
  ADD CONSTRAINT auth_attempts_type_check
  CHECK (type = ANY (ARRAY['pin'::text, 'passkey'::text, 'login'::text, 'stepup'::text, 'voice'::text]));

-- webauthn_challenges.purpose: 'register' | 'authenticate'  →  + 'voice'
ALTER TABLE public.webauthn_challenges
  DROP CONSTRAINT IF EXISTS webauthn_challenges_purpose_check;
ALTER TABLE public.webauthn_challenges
  ADD CONSTRAINT webauthn_challenges_purpose_check
  CHECK (purpose = ANY (ARRAY['register'::text, 'authenticate'::text, 'voice'::text]));

-- ----------------------------------------------------------------------------
-- 3. voice_biometric_profiles — AES-256-GCM encrypted voiceprint storage
--
--    Security design:
--      - `profile`, `iv`, `tag` are the AES-256-GCM ciphertext + nonce + auth-tag,
--        all stored as base64 text. The server decrypts at verify-time using VOICE_ENC_KEY.
--      - The encrypted blob is NEVER returned to the browser — API routes return metadata only.
--      - Raw audio is never persisted (in-memory per request).
--      - `consent_at` records explicit user consent before any biometric capture.
--      - ON DELETE CASCADE ensures right-to-deletion: removing auth.users removes the voiceprint.
--      - Rotating VOICE_ENC_KEY invalidates stored profiles (all users must re-enroll).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_biometric_profiles (
  id           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider     text         NOT NULL DEFAULT 'eagle',   -- 'eagle' | 'passphrase'
  -- AES-256-GCM encrypted Eagle voiceprint (base64 encoded)
  profile      text         NOT NULL,  -- ciphertext
  iv           text         NOT NULL,  -- 12-byte nonce, base64
  tag          text         NOT NULL,  -- 16-byte GCM auth tag, base64
  sample_count integer,               -- number of enrollment samples used
  threshold    real,                  -- score threshold used at enrollment time
  consent_at   timestamptz,           -- timestamp of explicit user consent
  enrolled_at  timestamptz  NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- updated_at trigger (reuse the set_updated_at function from migration 019)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'voice_biometric_profiles_updated_at'
  ) THEN
    CREATE TRIGGER voice_biometric_profiles_updated_at
      BEFORE UPDATE ON public.voice_biometric_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. RLS for voice_biometric_profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.voice_biometric_profiles ENABLE ROW LEVEL SECURITY;

-- Owner can SELECT their own row (metadata only — routes never return profile/iv/tag to client)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'voice_biometric_profiles'
      AND policyname = 'voice_biometric_profiles_owner_select'
  ) THEN
    CREATE POLICY voice_biometric_profiles_owner_select
      ON public.voice_biometric_profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can do everything (enroll, verify, delete — all via server-side routes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'voice_biometric_profiles'
      AND policyname = 'voice_biometric_profiles_service_all'
  ) THEN
    CREATE POLICY voice_biometric_profiles_service_all
      ON public.voice_biometric_profiles
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Ensure profiles.biometric_enabled exists (live-DB-only column, no prior migration)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS biometric_enabled boolean NOT NULL DEFAULT false;

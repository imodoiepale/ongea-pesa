-- Migration 014: WebAuthn passkeys + account lockout
-- Part of Workstream A (world-class security). Safe to run multiple times.
--
-- Biometrics ("Face ID / Touch ID") are delegated to the user's device via
-- WebAuthn. We store ONLY a public key + credential id — never any biometric
-- image or template.

-- 1. Passkey credentials ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id  text NOT NULL UNIQUE,      -- base64url
  public_key     text NOT NULL,             -- base64url COSE public key
  counter        bigint NOT NULL DEFAULT 0,
  transports     text[],
  device_label   text,
  created_at     timestamp with time zone DEFAULT now(),
  last_used_at   timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user ON public.webauthn_credentials (user_id);

-- Short-lived challenge store for register/authenticate ceremonies
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge   text NOT NULL,
  purpose     text NOT NULL CHECK (purpose = ANY (ARRAY['register','authenticate'])),
  created_at  timestamp with time zone DEFAULT now(),
  expires_at  timestamp with time zone DEFAULT (now() + '00:05:00'::interval)
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenge_user ON public.webauthn_challenges (user_id);

-- 2. Failed-attempt tracking + lockout ---------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type = ANY (ARRAY['pin','passkey','login','stepup'])),
  success     boolean NOT NULL,
  ip          text,
  created_at  timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_user_time
  ON public.auth_attempts (user_id, created_at DESC);

-- Lockout state on the profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;

-- 3. Step-up tokens (fresh PIN/passkey proof gating money movement) -----------
CREATE TABLE IF NOT EXISTS public.stepup_tokens (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  method      text NOT NULL CHECK (method = ANY (ARRAY['pin','passkey'])),
  consumed    boolean NOT NULL DEFAULT false,
  created_at  timestamp with time zone DEFAULT now(),
  expires_at  timestamp with time zone DEFAULT (now() + '00:05:00'::interval)
);

CREATE INDEX IF NOT EXISTS idx_stepup_tokens_token ON public.stepup_tokens (token);

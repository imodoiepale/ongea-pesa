-- Why onboarding never "finished": the columns it writes did not exist.
--
-- app/api/profile/route.ts builds one UPDATE per stage. Postgres rejects the
-- WHOLE statement if any column in it is missing, and the route then swallowed
-- that with isMissingColumnError() and fell back to writing user_metadata only.
--
-- Net effect for stage='onboarding-complete':
--   * device_biometrics_consent_at did not exist  -> UPDATE rejected
--   * so onboarding_completed_at was never persisted to profiles
--   * only auth.users.user_metadata got the stamp
--   * components/ongea-pesa/app.tsx reads the profile column first, sees NULL,
--     and the browser's cached JWT still holds the pre-update metadata, so the
--     user was bounced straight back to /security-setup. Forever.
--
-- Same story for stage='voice-funding', whose three columns were also absent.
--
-- Confirmed on a real account: epalletech@gmail.com had all three metadata
-- stamps set at 11:25-11:27 while profiles.onboarding_completed_at stayed NULL.
--
-- Migration 026 claimed to add device_biometrics_consent_at but it was never
-- present in the live database. A migration file existing in this repo does not
-- mean it has been applied — verify with information_schema.columns.
--
-- The swallow is now logged loudly in the route so this cannot recur silently.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_biometrics_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_funding_completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_funding_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS voice_funding_amount         NUMERIC;

COMMENT ON COLUMN public.profiles.device_biometrics_consent_at IS
  'When the user consented to device face/fingerprint verification. Required by the onboarding-complete write.';
COMMENT ON COLUMN public.profiles.voice_funding_completed_at IS
  'When the KSh 200 voice starter funding was confirmed. Gates the onboarding flow in components/ongea-pesa/app.tsx.';

-- Backfill from user_metadata for anyone already stranded by this, so they are
-- not asked to redo onboarding they already completed and paid for.
UPDATE public.profiles p
SET onboarding_completed_at = COALESCE(
      p.onboarding_completed_at,
      (u.raw_user_meta_data ->> 'onboarding_completed_at')::timestamptz),
    voice_funding_completed_at = COALESCE(
      p.voice_funding_completed_at,
      (u.raw_user_meta_data ->> 'voice_funding_completed_at')::timestamptz),
    voice_calibrated_at = COALESCE(
      p.voice_calibrated_at,
      (u.raw_user_meta_data ->> 'voice_calibrated_at')::timestamptz)
FROM auth.users u
WHERE u.id = p.id
  AND (u.raw_user_meta_data ->> 'onboarding_completed_at' IS NOT NULL
    OR u.raw_user_meta_data ->> 'voice_funding_completed_at' IS NOT NULL
    OR u.raw_user_meta_data ->> 'voice_calibrated_at' IS NOT NULL);

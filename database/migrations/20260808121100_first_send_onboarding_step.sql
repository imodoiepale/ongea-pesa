-- First-send onboarding step: the user sends a small amount to their own M-Pesa
-- so they see the whole rail work end to end, and an SMS actually arrive.
--
-- Ordering constraint: this MUST come after security-setup. Sending money
-- requires a step-up token from a PIN or passkey (see /api/wallet/withdraw), and
-- the PIN is set during security-setup.
--
-- The minimum send is KSh 50 — NCBA's floor for a mobile-money payout, not a
-- product choice. At 50 the provider fee is 0 and the platform fee is 0.25, so
-- roughly 150 of the KSh 200 starter balance remains for voice.
--
-- Deliberately skippable. security-setup still stamps onboarding_completed_at
-- BEFORE the user reaches this screen, so abandoning here cannot strand anyone
-- in a redirect loop — which is exactly the failure that trapped a paying user
-- on /security-setup (see 20260807114300_onboarding_missing_columns.sql).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_send_completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_send_skipped_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_send_transaction_id UUID;

COMMENT ON COLUMN public.profiles.first_send_completed_at IS
  'When the user completed the send-to-own-M-Pesa onboarding step.';
COMMENT ON COLUMN public.profiles.first_send_skipped_at IS
  'When the user dismissed the send-to-own-M-Pesa step. Set so the nudge stops; never blocks the dashboard.';

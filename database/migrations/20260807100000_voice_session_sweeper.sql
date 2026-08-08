-- Stranded voice sessions: repair, expire at zero, and never let it recur.
--
-- 27 sessions sat in status='active', unbilled, because the settle endpoint
-- wrote status='completed' against a CHECK constraint that did not allow it
-- (fixed in 20260806120000_revenue_truth_layer). They cannot simply be billed
-- now, for a reason that is worth spelling out:
--
--   Migration 028 added voice_sessions.started_at and backfilled it with now().
--   Every one of these rows therefore carries an IDENTICAL started_at of
--   2026-08-05 09:28:50 while created_at spans Nov 2025. That timestamp is a
--   migration artifact, not a real start time.
--
--   Billing from it measures ~50 hours per session:
--     KSh 59,854 per session, KSh 1,616,078 total, across 4 real users.
--
-- So: repair the timestamp, expire the sessions at ZERO charge, and record why
-- on the row itself. A user is never charged for a session whose duration we
-- cannot actually establish.
--
-- Apply: paste into Supabase SQL editor -> Run. Idempotent.

-- ── 1. Repair the backfill artifact ───────────────────────────────────────────
-- started_at after expires_at is impossible for a real session. created_at is
-- the only trustworthy anchor we have, and the 15-minute expiry window then
-- bounds any duration sensibly.

UPDATE public.voice_sessions
SET started_at = created_at
WHERE started_at IS NOT NULL
  AND expires_at IS NOT NULL
  AND started_at > expires_at;

-- ── 2. Expire the stranded sessions at zero charge ────────────────────────────
-- Guarded on usage_transaction_id IS NULL so a genuinely billed session can
-- never be swept up by this.

UPDATE public.voice_sessions
SET status          = 'expired',
    ended_at        = COALESCE(ended_at, expires_at, created_at),
    duration_seconds = 0,
    billing_error   = 'Not billed: started_at was a migration-028 backfill artifact, so the real duration is unknown. Expired at zero rather than charged.'
WHERE status = 'active'
  AND usage_transaction_id IS NULL
  AND expires_at < now();

-- ── 3. Index for the sweeper ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_voice_sessions_sweep
  ON public.voice_sessions(expires_at)
  WHERE status = 'active';

COMMENT ON COLUMN public.voice_sessions.billing_error IS
  'Why a session was not billed, or the error that blocked billing. Populated by the settle endpoint and the sweeper.';

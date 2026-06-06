-- Migration 016: pending_voice_payments staging table
--
-- Voice-initiated money movements are staged here and only released after the
-- user confirms in the app with a fresh PIN or passkey (step-up). Closes A6
-- of the security plan: "voice commands cannot move money without step-up".

CREATE TABLE IF NOT EXISTS public.pending_voice_payments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_session_id  text,                       -- ElevenLabs session id when available
  payload           jsonb NOT NULL,             -- the original send_money payload
  summary           text,                       -- short human summary for the confirm UI
  status            text NOT NULL DEFAULT 'awaiting_confirm'
                       CHECK (status = ANY (ARRAY['awaiting_confirm','released','cancelled','expired','failed'])),
  released_at       timestamp with time zone,
  cancelled_at      timestamp with time zone,
  result            jsonb,                      -- response from /webhook/send_money once released
  created_at        timestamp with time zone DEFAULT now(),
  expires_at        timestamp with time zone DEFAULT (now() + '00:10:00'::interval)
);

CREATE INDEX IF NOT EXISTS idx_pending_voice_user_status
  ON public.pending_voice_payments (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_voice_expires
  ON public.pending_voice_payments (expires_at)
  WHERE status = 'awaiting_confirm';

-- Owner-only access. Server-side release uses the service-role client, which
-- bypasses RLS, so no broad update policy is needed.
ALTER TABLE public.pending_voice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_voice_select_own ON public.pending_voice_payments;
CREATE POLICY pending_voice_select_own ON public.pending_voice_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pending_voice_cancel_own ON public.pending_voice_payments;
CREATE POLICY pending_voice_cancel_own ON public.pending_voice_payments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('cancelled'));

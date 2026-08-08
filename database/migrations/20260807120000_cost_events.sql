-- Infrastructure cost tracking.
--
-- The economics dashboard currently reports revenue with no infrastructure cost
-- at all, which makes voice look infinitely profitable. It is not: voice sells
-- at KSh 20/min and every minute costs real money in TTS, STT, transport and
-- (eventually) GPU time. Until that is recorded, "voice revenue" is a number
-- with no margin attached to it.
--
-- Two distinct kinds of spend, deliberately separate line items:
--   * Per-use API credits  — Fish Audio, ElevenLabs, LiveKit, Resend.
--   * GPU training runs    — RunPod, per Whisper fine-tune, tied to a model
--                            version. Fish Audio does NOT run on your GPU; it is
--                            a hosted API. The GPU is for ASR fine-tuning only.
--
-- Apply: paste into Supabase SQL editor -> Run. Idempotent.

CREATE TABLE IF NOT EXISTS public.cost_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT        NOT NULL
                               CHECK (provider = ANY (ARRAY[
                                 'fish_audio','elevenlabs','livekit','runpod','resend','openai','other'])),
  -- e.g. 'tts', 'stt', 'transport', 'training', 'email'
  category       TEXT        NOT NULL,
  quantity       NUMERIC     NOT NULL DEFAULT 0,
  -- e.g. 'characters', 'seconds', 'minutes', 'gpu_hours', 'emails'
  unit           TEXT        NOT NULL,
  unit_cost_usd  NUMERIC,
  amount_usd     NUMERIC     NOT NULL DEFAULT 0,
  amount_kes     NUMERIC     NOT NULL DEFAULT 0,
  -- What this cost is attributable to: a voice session, a model version, a user.
  reference_type TEXT,
  reference_id   TEXT,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  environment    TEXT        NOT NULL DEFAULT 'live'
                               CHECK (environment = ANY (ARRAY['test','live'])),
  metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_events_env_time
  ON public.cost_events(environment, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_events_provider_time
  ON public.cost_events(provider, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_events_reference
  ON public.cost_events(reference_type, reference_id);

-- Idempotency for the worker: the same session must not be billed for TTS twice
-- if a retry fires. Partial so rows without a reference are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_events_ref_category
  ON public.cost_events(reference_type, reference_id, provider, category)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.cost_events ENABLE ROW LEVEL SECURITY;

-- Costs are platform-internal. No owner policy: a user has no business reading
-- what their voice minute cost us. Admin reads go through the service role.
DROP POLICY IF EXISTS cost_events_service_all ON public.cost_events;
CREATE POLICY cost_events_service_all ON public.cost_events
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.cost_events IS
  'Infrastructure spend per provider, so revenue can be compared against what it costs to serve. Fish Audio/ElevenLabs/LiveKit are per-use API credits; RunPod is GPU training time.';

-- ── Aggregation ───────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_cost_totals(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE FUNCTION public.get_cost_totals(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_environment TEXT DEFAULT 'live')
RETURNS TABLE (
  provider     TEXT,
  category     TEXT,
  events       BIGINT,
  quantity     NUMERIC,
  unit         TEXT,
  amount_usd   NUMERIC,
  amount_kes   NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT c.provider, c.category, COUNT(*), SUM(c.quantity), MIN(c.unit),
         SUM(c.amount_usd), SUM(c.amount_kes)
  FROM public.cost_events c
  WHERE c.environment = p_environment
    AND c.occurred_at BETWEEN p_start AND p_end
  GROUP BY c.provider, c.category
  ORDER BY 7 DESC;
$fn$;

-- The number that actually matters: is a voice minute profitable?
DROP FUNCTION IF EXISTS public.get_voice_unit_economics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE FUNCTION public.get_voice_unit_economics(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_environment TEXT DEFAULT 'live')
RETURNS TABLE (
  billed_minutes   NUMERIC,
  voice_revenue    NUMERIC,
  voice_cost_kes   NUMERIC,
  revenue_per_min  NUMERIC,
  cost_per_min     NUMERIC,
  margin_per_min   NUMERIC,
  sessions         BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  WITH mins AS (
    SELECT
      COALESCE(SUM(vs.duration_seconds), 0) / 60.0 AS minutes,
      COUNT(*) FILTER (WHERE vs.usage_transaction_id IS NOT NULL) AS sessions
    FROM public.voice_sessions vs
    WHERE vs.environment = p_environment
      AND vs.created_at BETWEEN p_start AND p_end
  ),
  rev AS (
    SELECT COALESCE(SUM(e.platform_revenue), 0) AS revenue
    FROM public.v_transaction_economics e
    WHERE e.status = 'completed'
      AND e.environment = p_environment
      AND e.type IN ('voice_usage','platform_fee')
      AND e.created_at BETWEEN p_start AND p_end
  ),
  cost AS (
    -- Only the providers that serve a live voice minute. RunPod training is a
    -- fixed cost, not per-minute, so it is excluded from unit economics.
    SELECT COALESCE(SUM(c.amount_kes), 0) AS kes
    FROM public.cost_events c
    WHERE c.environment = p_environment
      AND c.provider IN ('fish_audio','elevenlabs','livekit','openai')
      AND c.occurred_at BETWEEN p_start AND p_end
  )
  SELECT
    ROUND(mins.minutes, 3),
    rev.revenue,
    cost.kes,
    CASE WHEN mins.minutes > 0 THEN ROUND(rev.revenue / mins.minutes, 2) END,
    CASE WHEN mins.minutes > 0 THEN ROUND(cost.kes    / mins.minutes, 2) END,
    CASE WHEN mins.minutes > 0 THEN ROUND((rev.revenue - cost.kes) / mins.minutes, 2) END,
    mins.sessions
  FROM mins, rev, cost;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_cost_totals(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_voice_unit_economics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.get_voice_unit_economics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS
  'Revenue, cost and margin per billed voice minute. Excludes RunPod: training is a fixed cost, not per-minute.';

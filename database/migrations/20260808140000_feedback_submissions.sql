-- User feedback and issue reporting.
--
-- Two things get captured together on purpose: what people are trying to do with
-- the app, and what is going wrong. Separating them into different forms means
-- the "how are you using it" answers never arrive, because nobody fills in a
-- survey — whereas people will always report a bug, and the usage context comes
-- along with it.
--
-- Route and device are captured automatically rather than asked for. A report
-- that says "it did not work" with no screen attached is close to useless, and
-- asking the user which page they were on is asking them to do our job.

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  category       TEXT        NOT NULL
                               CHECK (category = ANY (ARRAY['issue','idea','usage','praise','other'])),
  -- Only meaningful for category='issue'; null otherwise, so the triage queue
  -- cannot lie about how many real problems exist.
  severity       TEXT        CHECK (severity = ANY (ARRAY['blocking','major','minor'])),
  message        TEXT        NOT NULL CHECK (length(btrim(message)) > 0),
  route          TEXT,
  user_agent     TEXT,
  app_version    TEXT,
  -- Optional: how much money was involved when a payment misbehaved. The single
  -- most useful field for triaging a money bug.
  amount         NUMERIC,
  transaction_id UUID,
  status         TEXT        NOT NULL DEFAULT 'new'
                               CHECK (status = ANY (ARRAY['new','triaged','in_progress','resolved','wont_fix'])),
  admin_notes    TEXT,
  resolved_at    TIMESTAMPTZ,
  environment    TEXT        NOT NULL DEFAULT 'live'
                               CHECK (environment = ANY (ARRAY['test','live'])),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_open
  ON public.feedback_submissions(created_at DESC)
  WHERE status IN ('new','triaged','in_progress');

CREATE INDEX IF NOT EXISTS idx_feedback_user
  ON public.feedback_submissions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_category
  ON public.feedback_submissions(category, created_at DESC);

DO $mig$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'feedback_submissions_updated_at') THEN
    CREATE TRIGGER feedback_submissions_updated_at
      BEFORE UPDATE ON public.feedback_submissions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $mig$;

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Users may file a report and read their own. They cannot see anyone else's, and
-- there is deliberately no owner UPDATE policy: an editable report is not evidence.
DROP POLICY IF EXISTS feedback_owner_insert ON public.feedback_submissions;
CREATE POLICY feedback_owner_insert ON public.feedback_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS feedback_owner_select ON public.feedback_submissions;
CREATE POLICY feedback_owner_select ON public.feedback_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS feedback_service_all ON public.feedback_submissions;
CREATE POLICY feedback_service_all ON public.feedback_submissions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.feedback_submissions IS
  'User-submitted usage notes and issue reports. Route/device captured automatically; admin triage via /admin-analytics/feedback.';
COMMENT ON COLUMN public.feedback_submissions.route IS
  'Client route at submission time. Captured automatically — a report with no screen attached is nearly untriageable.';

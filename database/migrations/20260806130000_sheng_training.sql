-- Sheng / Swahili speech training data collection
--
-- Commercial STT does not handle Sheng code-switching. The published approach for
-- this class of problem is LoRA fine-tuning of Whisper on in-domain audio, which
-- needs a labelled corpus we do not have. This migration is the collection and
-- review substrate for building one.
--
-- Governance decisions baked in here:
--   * Contributors give EXPLICIT consent per submission (consent_at NOT NULL) and
--     can delete their own recordings. Voice is biometric-adjacent personal data
--     in a regulated app; implicit consent via terms is not enough.
--   * Reviewers are INVITE-ONLY via sheng_reviewers, deliberately separate from
--     lib/admin.ts so review access can be handed out without granting admin.
--   * Audio lives in a private bucket scoped to the uploader's uid folder, the
--     same pattern as `receipts` and `voice-biometric-samples`.
--
-- Apply: paste into Supabase SQL editor -> Run. Idempotent.

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Follows migration 026 (executable SQL), not 018's manual-only note.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sheng-training-audio',
  'sheng-training-audio',
  false,
  10485760, -- 10 MB; clips are short but webm/opus headroom is cheap
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sheng_audio_owner_select" on storage.objects;
drop policy if exists "sheng_audio_owner_insert" on storage.objects;
drop policy if exists "sheng_audio_owner_delete" on storage.objects;

create policy "sheng_audio_owner_select"
on storage.objects for select
using (
  bucket_id = 'sheng-training-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "sheng_audio_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'sheng-training-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "sheng_audio_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'sheng-training-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Reviewer allowlist ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sheng_reviewers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheng_reviewers_email
  ON public.sheng_reviewers(lower(email)) WHERE active;

ALTER TABLE public.sheng_reviewers ENABLE ROW LEVEL SECURITY;

-- Reviewers may see that they are a reviewer; the list itself is service-role only.
DROP POLICY IF EXISTS sheng_reviewers_self_select ON public.sheng_reviewers;
CREATE POLICY sheng_reviewers_self_select ON public.sheng_reviewers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sheng_reviewers_service_all ON public.sheng_reviewers;
CREATE POLICY sheng_reviewers_service_all ON public.sheng_reviewers
  FOR ALL USING (auth.role() = 'service_role');

-- ── Prompts ───────────────────────────────────────────────────────────────────
-- The phrases contributors are asked to say. Payment-domain first: the model only
-- has to be good at what the voice agent actually hears.

CREATE TABLE IF NOT EXISTS public.sheng_prompts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text       TEXT        NOT NULL,
  variety    TEXT        NOT NULL DEFAULT 'sheng'
                           CHECK (variety = ANY (ARRAY['sheng','swahili','mixed','english'])),
  category   TEXT        NOT NULL DEFAULT 'payment',
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheng_prompts_active
  ON public.sheng_prompts(variety, created_at) WHERE active;

ALTER TABLE public.sheng_prompts ENABLE ROW LEVEL SECURITY;

-- Prompts are reference data — any signed-in user needs to read them to record.
DROP POLICY IF EXISTS sheng_prompts_read_all ON public.sheng_prompts;
CREATE POLICY sheng_prompts_read_all ON public.sheng_prompts
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS sheng_prompts_service_all ON public.sheng_prompts;
CREATE POLICY sheng_prompts_service_all ON public.sheng_prompts
  FOR ALL USING (auth.role() = 'service_role');

-- ── Contributions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sheng_contributions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id      UUID        REFERENCES public.sheng_prompts(id) ON DELETE SET NULL,
  audio_path     TEXT        NOT NULL,          -- sheng-training-audio/{uid}/{file}
  transcript     TEXT        NOT NULL,          -- what the contributor says they said
  variety        TEXT        NOT NULL DEFAULT 'sheng'
                               CHECK (variety = ANY (ARRAY['sheng','swahili','mixed','english'])),
  duration_ms    INTEGER,
  -- Explicit, per-submission consent. NOT NULL by design: a row cannot exist
  -- without a recorded consent timestamp.
  consent_at     TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  review_count   INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheng_contributions_user
  ON public.sheng_contributions(user_id, created_at DESC);

-- Review queue: cheapest-first ordering over the pending backlog.
CREATE INDEX IF NOT EXISTS idx_sheng_contributions_queue
  ON public.sheng_contributions(review_count, created_at) WHERE status = 'pending';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sheng_contributions_updated_at') THEN
    CREATE TRIGGER sheng_contributions_updated_at
      BEFORE UPDATE ON public.sheng_contributions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.sheng_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sheng_contributions_owner_select ON public.sheng_contributions;
CREATE POLICY sheng_contributions_owner_select ON public.sheng_contributions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sheng_contributions_owner_insert ON public.sheng_contributions;
CREATE POLICY sheng_contributions_owner_insert ON public.sheng_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contributors can withdraw their own data. Deliberately not restricted to
-- 'pending': consent is revocable at any time.
DROP POLICY IF EXISTS sheng_contributions_owner_delete ON public.sheng_contributions;
CREATE POLICY sheng_contributions_owner_delete ON public.sheng_contributions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sheng_contributions_service_all ON public.sheng_contributions;
CREATE POLICY sheng_contributions_service_all ON public.sheng_contributions
  FOR ALL USING (auth.role() = 'service_role');

-- ── Reviews ───────────────────────────────────────────────────────────────────
-- Multiple reviews per contribution so inter-reviewer agreement is measurable;
-- a single reviewer's word is not evidence of transcript accuracy.

CREATE TABLE IF NOT EXISTS public.sheng_reviews (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id     UUID        NOT NULL REFERENCES public.sheng_contributions(id) ON DELETE CASCADE,
  reviewer_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict             TEXT        NOT NULL
                                    CHECK (verdict = ANY (ARRAY['approve','correct','reject'])),
  corrected_transcript TEXT,
  audio_quality       TEXT        CHECK (audio_quality = ANY (ARRAY['good','noisy','unusable'])),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contribution_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_sheng_reviews_contribution
  ON public.sheng_reviews(contribution_id);

CREATE INDEX IF NOT EXISTS idx_sheng_reviews_reviewer
  ON public.sheng_reviews(reviewer_id, created_at DESC);

ALTER TABLE public.sheng_reviews ENABLE ROW LEVEL SECURITY;

-- Reviewers see their own reviews. Cross-reviewer visibility would bias
-- agreement scoring, so it is not granted. Aggregation happens service-side.
DROP POLICY IF EXISTS sheng_reviews_own_select ON public.sheng_reviews;
CREATE POLICY sheng_reviews_own_select ON public.sheng_reviews
  FOR SELECT USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS sheng_reviews_service_all ON public.sheng_reviews;
CREATE POLICY sheng_reviews_service_all ON public.sheng_reviews
  FOR ALL USING (auth.role() = 'service_role');

-- ── Seed prompts ──────────────────────────────────────────────────────────────
-- Payment-domain phrases in the registers the voice agent actually meets.

INSERT INTO public.sheng_prompts (text, variety, category)
SELECT * FROM (VALUES
  ('Nitumie mia tano kwa nambari hii',                'swahili', 'payment'),
  ('Tuma ganji kwa Wakili',                           'sheng',   'payment'),
  ('Niaje, nitumie chwani mbili',                     'sheng',   'payment'),
  ('Lipa bill ya stima elfu moja',                    'swahili', 'payment'),
  ('Nataka kucheki balance yangu',                    'mixed',   'balance'),
  ('Balance yangu iko aje?',                          'sheng',   'balance'),
  ('Send five hundred to zero seven four three',      'english', 'payment'),
  ('Nilipe paybill mia tisa tisa tisa',               'swahili', 'payment'),
  ('Buda, nitumie soo mbili haraka',                  'sheng',   'payment'),
  ('Withdraw elfu tatu kutoka kwa wallet',            'mixed',   'withdraw'),
  ('Nunua airtime ya hamsini',                        'swahili', 'airtime'),
  ('Nitumie doo kwa till nambari saba nne mbili',     'sheng',   'payment'),
  ('Cancel hiyo transaction',                         'mixed',   'control'),
  ('Rudia tena, sikuelewa',                           'swahili', 'control'),
  ('Confirm hiyo payment',                            'mixed',   'control')
) AS seed(text, variety, category)
WHERE NOT EXISTS (SELECT 1 FROM public.sheng_prompts);

COMMENT ON TABLE public.sheng_contributions IS 'Consented Sheng/Swahili speech samples contributed by users for ASR fine-tuning.';
COMMENT ON COLUMN public.sheng_contributions.consent_at IS 'Explicit per-submission consent timestamp. NOT NULL: no row may exist without it.';
COMMENT ON TABLE public.sheng_reviews IS 'Per-reviewer verdicts on a contribution; multiple rows per contribution enable agreement scoring.';
COMMENT ON TABLE public.sheng_reviewers IS 'Invite-only review access, deliberately separate from the lib/admin.ts admin allowlist.';

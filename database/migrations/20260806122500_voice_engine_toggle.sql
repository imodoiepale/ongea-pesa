-- Admin-only voice engine selector.
--
-- ElevenLabs stays the default for everyone; LiveKit + Fish Audio runs in
-- parallel and is opt-in per user, settable only through an admin-gated route
-- (app/api/admin/voice-engine/route.ts).
--
-- NOTE ON ENFORCEMENT: a column-level REVOKE does NOT work here. profiles
-- already carries a table-wide UPDATE grant to anon/authenticated which
-- supersedes it — verified against information_schema.column_privileges after
-- attempting the revoke, which silently left UPDATE in place. Revoking table
-- UPDATE and re-granting every other column individually would break as the
-- schema grows, so the rule is enforced by a trigger instead.
--
-- Applied via MCP as: voice_engine_toggle + voice_engine_guard_trigger

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_engine TEXT NOT NULL DEFAULT 'elevenlabs';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_voice_engine_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_voice_engine_check
  CHECK (voice_engine = ANY (ARRAY['elevenlabs','livekit']));

COMMENT ON COLUMN public.profiles.voice_engine IS
  'Which voice runtime this user gets. Admin-settable only (see /api/admin/voice-engine); defaults to elevenlabs.';

CREATE OR REPLACE FUNCTION public.guard_voice_engine_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.voice_engine IS DISTINCT FROM OLD.voice_engine
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user IS DISTINCT FROM 'service_role'
     AND current_user IS DISTINCT FROM 'postgres'
  THEN
    RAISE EXCEPTION 'voice_engine may only be changed by an administrator'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.guard_voice_engine_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_voice_engine ON public.profiles;
CREATE TRIGGER profiles_guard_voice_engine
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_voice_engine_update();

COMMENT ON FUNCTION public.guard_voice_engine_update() IS
  'Blocks non-service-role changes to profiles.voice_engine; a user must not be able to move themselves onto the experimental voice path.';

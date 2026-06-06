-- Migration 015: Enable Row-Level Security on core tables (CRITICAL)
--
-- ⚠️  REVIEW BEFORE APPLYING. Enabling RLS without policies blocks ALL access.
-- This migration enables RLS AND adds owner policies, so authenticated users
-- keep access to their own rows. Server routes use the SERVICE ROLE key, which
-- bypasses RLS, so server-side logic is unaffected. The anon key (browser) is
-- restricted to the current user's own rows.
--
-- Verify after applying: a user must NOT be able to read another user's
-- profiles/transactions row with the anon key; all server routes must still work.

-- profiles --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- transactions ----------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
CREATE POLICY transactions_insert_own ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- NOTE: status transitions / provider reconciliation happen via the service
-- role (server), which bypasses RLS. No broad UPDATE policy is granted to users.

-- subscription_plans (reference data) -----------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_read_all ON public.subscription_plans;
CREATE POLICY subscription_plans_read_all ON public.subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- Security tables: owner-readable, writes via service role only ---------------
ALTER TABLE public.security_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_events_select_own ON public.security_events;
CREATE POLICY security_events_select_own ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS webauthn_select_own ON public.webauthn_credentials;
CREATE POLICY webauthn_select_own ON public.webauthn_credentials
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS auth_attempts_select_own ON public.auth_attempts;
CREATE POLICY auth_attempts_select_own ON public.auth_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- audit_log, webauthn_challenges, stepup_tokens: no user-facing policies.
-- RLS on (deny-all to anon/authenticated); only the service role can touch them.
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stepup_tokens       ENABLE ROW LEVEL SECURITY;

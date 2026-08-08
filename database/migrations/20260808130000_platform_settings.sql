-- Real persistence for the admin settings page.
--
-- Three of its four panels were useState stubs: Platform Fee (hardcoded
-- "0.00005"), Email Notifications and Auto-approve. Editing them did nothing and
-- said nothing — a control that silently discards input is worse than no control,
-- because it invites someone to believe the platform fee has been changed.
--
-- The displayed value was also wrong by 100x: the stub held 0.00005 and rendered
-- (0.00005 * 100).toFixed(5) = "0.00500%", while the real rate in
-- lib/transaction-fees.ts is PLATFORM_FEE_RATE = 0.005, i.e. 0.5%.
--
-- Single-row-per-key store rather than a one-row table, so adding a setting is an
-- INSERT and not a migration.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only, via the service role. No owner policy: these are platform-wide
-- knobs and a user has no business reading or writing them.
DROP POLICY IF EXISTS platform_settings_service_all ON public.platform_settings;
CREATE POLICY platform_settings_service_all ON public.platform_settings
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('platform_fee_rate', '0.005'::jsonb,
   'Fraction of each outbound transaction taken as platform revenue. Mirrors PLATFORM_FEE_RATE in lib/transaction-fees.ts — change both together.'),
  ('email_notifications_enabled', 'true'::jsonb,
   'Send admin email alerts for large transactions.'),
  ('large_transaction_threshold', '10000'::jsonb,
   'KSh amount above which a transaction is considered large.'),
  ('auto_approve_enabled', 'false'::jsonb,
   'Auto-approve transactions under the threshold without manual review.')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS
  'Admin-configurable platform knobs. Service-role only; written through /api/admin/settings.';

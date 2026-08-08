-- Revenue truth layer
--
-- Four places in the app derived "what we earn" four different ways:
--   * app/api/admin/overview       — subtracted ALL transaction_cost, including
--                                    customer-borne pass-through, so deposits
--                                    dragged net margin negative.
--   * migration 025's RPCs         — correctly excluded customer-borne cost, but
--                                    counted platform_fee ONLY, so voice airtime
--                                    revenue (KSh 20/min) was invisible.
--   * five client pages            — recomputed 0.5% in the browser with a
--                                    `platform_fee > 0 ? persisted : amount*0.005`
--                                    fallback, which silently re-charges genuinely
--                                    free transactions in every report.
--
-- This migration makes the database the single source of truth. Every reader is
-- repointed at v_transaction_economics or the RPCs built on it.
--
-- Two blocking constraint bugs are fixed here as well, because no amount of
-- reporting work matters while the rows never get written:
--
--   1. voice_sessions.status CHECK allowed only ('active','expired','ended') but
--      app/api/voice/session/complete/route.ts:83 writes 'completed'. The UPDATE
--      always failed, the error was discarded (only `data` was destructured), the
--      route early-returned `already_completed: true`, and the voice charge was
--      never inserted. Live DB confirms: 27 sessions stuck 'active', 0 'completed',
--      and ZERO voice_usage transactions have ever existed. Voice revenue reads as
--      zero because the biller is broken, not because nobody used it.
--
--   2. transactions.type CHECK had no 'subscription', but
--      app/api/subscription/pay/route.ts:64 inserts exactly that. Every wallet
--      subscription charge has been failing its INSERT.
--
-- Apply: paste into Supabase SQL editor -> Run. Idempotent.

-- ── Constraint fixes ──────────────────────────────────────────────────────────

ALTER TABLE public.voice_sessions
  DROP CONSTRAINT IF EXISTS voice_sessions_status_check;

ALTER TABLE public.voice_sessions
  ADD CONSTRAINT voice_sessions_status_check
  CHECK (status = ANY (ARRAY['active','expired','ended','completed']));

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY[
    'send_phone','buy_goods_pochi','buy_goods_till','paybill','withdraw',
    'bank_to_mpesa','mpesa_to_bank','deposit','receive',
    'voice_usage','platform_fee','subscription'
  ]));

-- ── Economics view ────────────────────────────────────────────────────────────
-- One row per transaction, with the revenue/cost classification resolved once.
-- security_invoker = true so RLS still applies to anyone querying it directly;
-- the admin RPCs below are SECURITY DEFINER and bypass it deliberately.

DROP VIEW IF EXISTS public.v_transaction_economics;

CREATE VIEW public.v_transaction_economics
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.type,
  t.status,
  t.created_at,
  t.completed_at,
  t.metadata ->> 'rail'        AS rail,
  t.metadata ->> 'cost_bearer' AS cost_bearer,

  -- Was the platform fee deliberately waived (free-tier / promo)? Without this
  -- flag a legitimate zero is indistinguishable from a missing value, which is
  -- what drove the 0.5% fallback in the first place.
  COALESCE(t.metadata ->> 'fee_waived', 'false') = 'true' AS fee_waived,

  t.amount AS gross_volume,

  -- Money actually moved on a payment rail. Voice airtime and the legacy
  -- fee-ledger rows are Ongea products, not payment volume.
  CASE WHEN t.type IN ('voice_usage','platform_fee','subscription')
       THEN 0 ELSE COALESCE(t.amount, 0) END AS payment_volume,

  -- What Ongea Pesa earns: the explicit platform fee on payment rails, PLUS the
  -- full amount on rows where the amount IS the product (voice airtime at
  -- KSh 20/min, subscriptions, and the pre-028 hidden fee-ledger rows).
  COALESCE(t.platform_fee, 0)
    + CASE WHEN t.type IN ('voice_usage','platform_fee','subscription')
           THEN COALESCE(t.amount, 0) ELSE 0 END AS platform_revenue,

  -- Provider charges Ongea absorbs. Customer-borne charges are pass-through:
  -- the customer pays Safaricom directly and Ongea never sees the money, so
  -- counting them as cost understates margin.
  CASE
    WHEN t.metadata ->> 'cost_bearer' = 'customer' OR t.type = 'deposit' THEN 0
    ELSE COALESCE(t.transaction_cost, 0)
  END AS ongea_cost,

  CASE
    WHEN t.metadata ->> 'cost_bearer' = 'customer' OR t.type = 'deposit'
      THEN COALESCE(t.transaction_cost, 0)
    ELSE 0
  END AS customer_borne_cost,

  COALESCE(t.platform_fee, 0)
    + CASE WHEN t.type IN ('voice_usage','platform_fee','subscription')
           THEN COALESCE(t.amount, 0) ELSE 0 END
    - CASE
        WHEN t.metadata ->> 'cost_bearer' = 'customer' OR t.type = 'deposit' THEN 0
        ELSE COALESCE(t.transaction_cost, 0)
      END AS net_margin
FROM public.transactions t;

COMMENT ON VIEW public.v_transaction_economics IS
  'Single source of truth for transaction economics. platform_revenue counts the amount itself for product rows (voice_usage, subscription, legacy platform_fee); customer-borne provider charges are pass-through, never cost.';

-- ── Reporting RPCs ────────────────────────────────────────────────────────────
-- Return signatures change, so the old definitions must go first.

DROP FUNCTION IF EXISTS public.get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_user_economics(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_revenue_summary(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  bucket_date         DATE,
  transaction_type    TEXT,
  tx_count            BIGINT,
  gross_volume        NUMERIC,
  payment_volume      NUMERIC,
  platform_revenue    NUMERIC,
  safaricom_cost      NUMERIC,
  customer_borne_cost NUMERIC,
  net_margin          NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    DATE(e.created_at),
    e.type,
    COUNT(*),
    SUM(e.gross_volume),
    SUM(e.payment_volume),
    SUM(e.platform_revenue),
    SUM(e.ongea_cost),
    SUM(e.customer_borne_cost),
    SUM(e.net_margin)
  FROM public.v_transaction_economics e
  WHERE e.status = 'completed'
    AND e.created_at BETWEEN p_start AND p_end
  GROUP BY DATE(e.created_at), e.type
  ORDER BY 1 DESC, 6 DESC;
$$;

CREATE FUNCTION public.get_revenue_totals(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  total_volume              NUMERIC,
  total_payment_volume      NUMERIC,
  total_revenue             NUMERIC,
  total_cost                NUMERIC,
  total_customer_borne_cost NUMERIC,
  total_net_margin          NUMERIC,
  total_transactions        BIGINT,
  fee_revenue               NUMERIC,
  voice_revenue             NUMERIC,
  subscription_revenue      NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(SUM(e.gross_volume), 0),
    COALESCE(SUM(e.payment_volume), 0),
    COALESCE(SUM(e.platform_revenue), 0),
    COALESCE(SUM(e.ongea_cost), 0),
    COALESCE(SUM(e.customer_borne_cost), 0),
    COALESCE(SUM(e.net_margin), 0),
    COUNT(*),
    -- Revenue split by source, so the dashboard can show where earnings come from.
    COALESCE(SUM(e.platform_revenue) FILTER (
      WHERE e.type NOT IN ('voice_usage','subscription','platform_fee')), 0),
    COALESCE(SUM(e.platform_revenue) FILTER (
      WHERE e.type IN ('voice_usage','platform_fee')), 0),
    COALESCE(SUM(e.platform_revenue) FILTER (WHERE e.type = 'subscription'), 0)
  FROM public.v_transaction_economics e
  WHERE e.status = 'completed'
    AND e.created_at BETWEEN p_start AND p_end;
$$;

-- Per-user economics — "deposits in every person's pocket", what each user cost
-- us, and what we earned from them.
CREATE FUNCTION public.get_user_economics(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  user_id             UUID,
  email               TEXT,
  full_name           TEXT,
  wallet_balance      NUMERIC,
  deposit_count       BIGINT,
  deposits_total      NUMERIC,
  spend_total         NUMERIC,
  platform_revenue    NUMERIC,
  ongea_cost          NUMERIC,
  customer_borne_cost NUMERIC,
  net_margin          NUMERIC,
  voice_revenue       NUMERIC,
  tx_count            BIGINT,
  last_activity_at    TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    COALESCE(p.wallet_balance, 0),
    COUNT(*) FILTER (WHERE e.type = 'deposit'),
    COALESCE(SUM(e.gross_volume) FILTER (WHERE e.type = 'deposit'), 0),
    COALESCE(SUM(e.payment_volume) FILTER (WHERE e.type <> 'deposit'), 0),
    COALESCE(SUM(e.platform_revenue), 0),
    COALESCE(SUM(e.ongea_cost), 0),
    COALESCE(SUM(e.customer_borne_cost), 0),
    COALESCE(SUM(e.net_margin), 0),
    COALESCE(SUM(e.platform_revenue) FILTER (
      WHERE e.type IN ('voice_usage','platform_fee')), 0),
    COUNT(e.id),
    MAX(e.created_at)
  FROM public.profiles p
  LEFT JOIN public.v_transaction_economics e
    ON e.user_id = p.id
   AND e.status = 'completed'
   AND e.created_at BETWEEN p_start AND p_end
  GROUP BY p.id, p.email, p.full_name, p.wallet_balance
  ORDER BY 11 DESC NULLS LAST;
$$;

-- These are admin reporting surfaces reached through the service-role client.
-- Do not expose them to browser sessions via PostgREST.
REVOKE EXECUTE ON FUNCTION public.get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_economics(TIMESTAMPTZ, TIMESTAMPTZ)  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Daily revenue/cost/margin buckets by transaction type, from v_transaction_economics.';
COMMENT ON FUNCTION public.get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ)  IS 'Period totals with revenue split by source (fees / voice / subscriptions).';
COMMENT ON FUNCTION public.get_user_economics(TIMESTAMPTZ, TIMESTAMPTZ)  IS 'Per-user deposits, spend, platform revenue and cost for the period.';

-- ── Pocket balance snapshots ──────────────────────────────────────────────────
-- IndexPay gate/pocket balances are only ever read over live HTTP
-- (app/admin-analytics/users/page.tsx), so they can never be trended. A sweeper
-- writes a row here on a schedule.

CREATE TABLE IF NOT EXISTS public.pocket_balance_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gate_name      TEXT,
  gate_balance   NUMERIC     NOT NULL DEFAULT 0,
  pocket_balance NUMERIC     NOT NULL DEFAULT 0,
  wallet_balance NUMERIC     NOT NULL DEFAULT 0,
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pocket_snapshots_user_time
  ON public.pocket_balance_snapshots(user_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_pocket_snapshots_time
  ON public.pocket_balance_snapshots(captured_at DESC);

ALTER TABLE public.pocket_balance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pocket_snapshots_owner_select ON public.pocket_balance_snapshots;
CREATE POLICY pocket_snapshots_owner_select ON public.pocket_balance_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pocket_snapshots_service_all ON public.pocket_balance_snapshots;
CREATE POLICY pocket_snapshots_service_all ON public.pocket_balance_snapshots
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.pocket_balance_snapshots IS
  'Periodic capture of IndexPay gate/pocket balances so they can be trended; the IndexPay API only exposes current values.';

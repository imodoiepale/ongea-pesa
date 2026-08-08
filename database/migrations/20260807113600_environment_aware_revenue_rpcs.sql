-- Make the economics view and RPCs environment-aware.
--
-- Supersedes the definitions in 20260806120000_revenue_truth_layer.sql: the view
-- gains an `environment` column and all three RPCs take p_environment, defaulting
-- to 'live'. Defaulting to live means a caller that forgets the parameter sees
-- real money, not sandbox noise.
--
-- Everything else about the classification is unchanged and documented in
-- 20260806120000: platform_revenue counts the amount itself for product rows
-- (voice_usage, subscription, legacy platform_fee), and customer-borne provider
-- charges are pass-through, never cost.

DROP VIEW IF EXISTS public.v_transaction_economics;

CREATE VIEW public.v_transaction_economics
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.type,
  t.status,
  t.environment,
  t.created_at,
  t.completed_at,
  t.metadata ->> 'rail'        AS rail,
  t.metadata ->> 'cost_bearer' AS cost_bearer,
  COALESCE(t.metadata ->> 'fee_waived', 'false') = 'true' AS fee_waived,
  t.amount AS gross_volume,
  CASE WHEN t.type IN ('voice_usage','platform_fee','subscription')
       THEN 0 ELSE COALESCE(t.amount, 0) END AS payment_volume,
  COALESCE(t.platform_fee, 0)
    + CASE WHEN t.type IN ('voice_usage','platform_fee','subscription')
           THEN COALESCE(t.amount, 0) ELSE 0 END AS platform_revenue,
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
  'Single source of truth for transaction economics, partitioned by environment (test vs live).';

DROP FUNCTION IF EXISTS public.get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_user_economics(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_revenue_summary(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_environment TEXT DEFAULT 'live')
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT DATE(e.created_at), e.type, COUNT(*),
    SUM(e.gross_volume), SUM(e.payment_volume), SUM(e.platform_revenue),
    SUM(e.ongea_cost), SUM(e.customer_borne_cost), SUM(e.net_margin)
  FROM public.v_transaction_economics e
  WHERE e.status = 'completed'
    AND e.environment = p_environment
    AND e.created_at BETWEEN p_start AND p_end
  GROUP BY DATE(e.created_at), e.type
  ORDER BY 1 DESC, 6 DESC;
$fn$;

CREATE FUNCTION public.get_revenue_totals(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_environment TEXT DEFAULT 'live')
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT
    COALESCE(SUM(e.gross_volume), 0),
    COALESCE(SUM(e.payment_volume), 0),
    COALESCE(SUM(e.platform_revenue), 0),
    COALESCE(SUM(e.ongea_cost), 0),
    COALESCE(SUM(e.customer_borne_cost), 0),
    COALESCE(SUM(e.net_margin), 0),
    COUNT(*),
    COALESCE(SUM(e.platform_revenue) FILTER (
      WHERE e.type NOT IN ('voice_usage','subscription','platform_fee')), 0),
    COALESCE(SUM(e.platform_revenue) FILTER (
      WHERE e.type IN ('voice_usage','platform_fee')), 0),
    COALESCE(SUM(e.platform_revenue) FILTER (WHERE e.type = 'subscription'), 0)
  FROM public.v_transaction_economics e
  WHERE e.status = 'completed'
    AND e.environment = p_environment
    AND e.created_at BETWEEN p_start AND p_end;
$fn$;

CREATE FUNCTION public.get_user_economics(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_environment TEXT DEFAULT 'live')
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT
    p.id, p.email, p.full_name, COALESCE(p.wallet_balance, 0),
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
   AND e.environment = p_environment
   AND e.created_at BETWEEN p_start AND p_end
  GROUP BY p.id, p.email, p.full_name, p.wallet_balance
  ORDER BY 11 DESC NULLS LAST;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_economics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)  FROM PUBLIC, anon, authenticated;

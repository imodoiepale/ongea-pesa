-- Migration 025: Stop counting customer-borne charges as Ongea Pesa cost
--
-- Migration 021's revenue RPCs summed transactions.transaction_cost as "safaricom_cost"
-- and subtracted it from net margin, with no regard for who actually pays it.
-- That was fine while transaction_cost only ever held provider charges Ongea absorbs
-- (NCBA bill pay, Daraja B2C).
--
-- The NCBA STK deposit rail now records the M-Pesa paybill tariff on deposit rows for
-- transparency, but that charge is paid by the customer to Safaricom — Ongea never sees
-- it. Left unguarded, every deposit would drag net margin negative by the full tariff
-- while contributing platform_fee = 0.
--
-- Rows are classified customer-borne via metadata->>'cost_bearer' = 'customer', with
-- type = 'deposit' as a fallback for rows written before that flag existed.
-- Customer-borne amounts are now reported separately instead of being silently dropped.

-- Return signatures change (new column), so the old definitions must go first.
DROP FUNCTION IF EXISTS get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_revenue_totals(TIMESTAMPTZ, TIMESTAMPTZ);

-- RPC: Daily breakdown of revenue, cost, net margin, transaction counts by type
-- safaricom_cost now covers ONLY charges Ongea Pesa absorbs.
CREATE FUNCTION get_revenue_summary(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  bucket_date DATE,
  transaction_type TEXT,
  tx_count BIGINT,
  gross_volume NUMERIC,
  platform_revenue NUMERIC,
  safaricom_cost NUMERIC,
  customer_borne_cost NUMERIC,
  net_margin NUMERIC
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE(created_at) AS bucket_date,
    type AS transaction_type,
    COUNT(*) AS tx_count,
    SUM(amount) AS gross_volume,
    SUM(COALESCE(platform_fee, 0)) AS platform_revenue,
    SUM(
      CASE
        WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit' THEN 0
        ELSE COALESCE(transaction_cost, 0)
      END
    ) AS safaricom_cost,
    SUM(
      CASE
        WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit'
          THEN COALESCE(transaction_cost, 0)
        ELSE 0
      END
    ) AS customer_borne_cost,
    SUM(
      COALESCE(platform_fee, 0)
      - CASE
          WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit' THEN 0
          ELSE COALESCE(transaction_cost, 0)
        END
    ) AS net_margin
  FROM public.transactions
  WHERE status = 'completed'
    AND created_at BETWEEN p_start AND p_end
  GROUP BY DATE(created_at), type
  ORDER BY bucket_date DESC, platform_revenue DESC;
$$;

-- RPC: Summary totals (no date grouping) — for stat cards
-- total_cost now covers ONLY charges Ongea Pesa absorbs.
CREATE FUNCTION get_revenue_totals(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  total_volume NUMERIC,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_customer_borne_cost NUMERIC,
  total_net_margin NUMERIC,
  total_transactions BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    SUM(amount) AS total_volume,
    SUM(COALESCE(platform_fee, 0)) AS total_revenue,
    SUM(
      CASE
        WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit' THEN 0
        ELSE COALESCE(transaction_cost, 0)
      END
    ) AS total_cost,
    SUM(
      CASE
        WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit'
          THEN COALESCE(transaction_cost, 0)
        ELSE 0
      END
    ) AS total_customer_borne_cost,
    SUM(
      COALESCE(platform_fee, 0)
      - CASE
          WHEN metadata->>'cost_bearer' = 'customer' OR type = 'deposit' THEN 0
          ELSE COALESCE(transaction_cost, 0)
        END
    ) AS total_net_margin,
    COUNT(*) AS total_transactions
  FROM public.transactions
  WHERE status = 'completed'
    AND created_at BETWEEN p_start AND p_end;
$$;

-- Migration 021: Add fee/cost/revenue columns to transactions
-- Matches the interface already expected by app/admin-analytics/transactions/page.tsx
-- PLATFORM_FEE_PERCENTAGE = 0.005 (0.5%)

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC;

-- Index for time-bucketed revenue queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON public.transactions (created_at DESC);

-- Backfill platform_fee for all existing completed transactions (0.5% of amount, excluding deposits/receives)
UPDATE public.transactions
SET platform_fee = ROUND(amount * 0.005, 2)
WHERE status = 'completed'
  AND type NOT IN ('deposit', 'receive')
  AND platform_fee = 0;

-- Backfill net_amount
UPDATE public.transactions
SET net_amount = amount - COALESCE(platform_fee, 0) - COALESCE(transaction_cost, 0)
WHERE status = 'completed'
  AND net_amount IS NULL;

-- RPC: Daily breakdown of revenue, cost, net margin, transaction counts by type
-- Used by /api/admin/transaction-costs for chart data
CREATE OR REPLACE FUNCTION get_revenue_summary(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  bucket_date DATE,
  transaction_type TEXT,
  tx_count BIGINT,
  gross_volume NUMERIC,
  platform_revenue NUMERIC,
  safaricom_cost NUMERIC,
  net_margin NUMERIC
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE(created_at) AS bucket_date,
    type AS transaction_type,
    COUNT(*) AS tx_count,
    SUM(amount) AS gross_volume,
    SUM(COALESCE(platform_fee, 0)) AS platform_revenue,
    SUM(COALESCE(transaction_cost, 0)) AS safaricom_cost,
    SUM(COALESCE(platform_fee, 0) - COALESCE(transaction_cost, 0)) AS net_margin
  FROM public.transactions
  WHERE status = 'completed'
    AND created_at BETWEEN p_start AND p_end
  GROUP BY DATE(created_at), type
  ORDER BY bucket_date DESC, platform_revenue DESC;
$$;

-- RPC: Summary totals (no date grouping) — for stat cards
CREATE OR REPLACE FUNCTION get_revenue_totals(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS TABLE (
  total_volume NUMERIC,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_net_margin NUMERIC,
  total_transactions BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    SUM(amount) AS total_volume,
    SUM(COALESCE(platform_fee, 0)) AS total_revenue,
    SUM(COALESCE(transaction_cost, 0)) AS total_cost,
    SUM(COALESCE(platform_fee, 0) - COALESCE(transaction_cost, 0)) AS total_net_margin,
    COUNT(*) AS total_transactions
  FROM public.transactions
  WHERE status = 'completed'
    AND created_at BETWEEN p_start AND p_end;
$$;

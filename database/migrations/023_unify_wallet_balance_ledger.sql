-- Migration 023 — Unify the wallet balance ledger
-- ============================================================================
-- Problem this fixes (see investigation 2026-06-17):
--   1. user_pockets.balance was a SECOND balance ledger (migration 019) maintained
--      by parallel triggers. It floored at 0 (GREATEST(0,…)) and knew only
--      transactions, so it diverged from profiles.wallet_balance
--      (e.g. 155.00 vs 0.00 for one user). Nothing reads user_pockets.balance for
--      display — main-dashboard reads only total_deposited — so we retire the
--      parallel balance and keep user_pockets purely as a "total deposited" stat.
--   2. profiles.wallet_balance contained value not represented by any transaction
--      (e.g. a +500 manual seed), so it could not be reproduced from the ledger.
--      Part 2 records that gap as an explicit reconciliation transaction so the
--      invariant  wallet_balance == Σ(completed signed txns)  holds going forward.
--
-- Canonical model after this migration:
--   profiles.wallet_balance is the ONE spendable balance, maintained ONLY by the
--   triggers update_wallet_balance / update_wallet_balance_on_status_change.
--   Every money movement must flow through a transactions row that reaches
--   status='completed'. (App routes no longer write wallet_balance directly —
--   see contacts/route.ts, subscription/pay/route.ts, wallet/withdraw/route.ts.)
--
-- Idempotent where practical. Apply in Supabase SQL editor (or via MCP).
-- ============================================================================


-- ── PART 1 — Retire user_pockets as a balance source ────────────────────────
-- Redefine the pocket trigger fn so it ONLY accumulates total_deposited (credits)
-- and no longer maintains the divergent, floored `balance`. Triggers stay in place
-- (trigger_update_user_pocket_on_insert / _on_update) and keep firing on completed
-- rows, but now only bump total_deposited on credit types.

CREATE OR REPLACE FUNCTION public.update_user_pocket_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  credit_types TEXT[] := ARRAY['deposit', 'receive'];
BEGIN
  -- Single-ledger model: profiles.wallet_balance is the canonical spendable balance.
  -- user_pockets now only tracks cumulative deposits for display; it NO LONGER
  -- maintains a parallel `balance` (that column is deprecated and frozen).
  IF NEW.type = ANY(credit_types) THEN
    INSERT INTO public.user_pockets (user_id, total_deposited)
    VALUES (NEW.user_id, NEW.amount)
    ON CONFLICT (user_id) DO UPDATE SET
      total_deposited = public.user_pockets.total_deposited + NEW.amount,
      updated_at = now();
  END IF;
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.user_pockets.balance IS
  'DEPRECATED (migration 023): no longer maintained. Use profiles.wallet_balance. Frozen at last value.';


-- ── PART 2 — Realign wallet_balance (⚠️ MANUAL / DO NOT RUN BLINDLY) ─────────
-- GOAL: make  wallet_balance == Σ(completed signed txns)  so the balance is
-- reproducible from the ledger.
--
-- ⚠️ A 2026-06-17 dry run showed the gaps are LARGE and span test data — e.g.
--    one account has wallet_balance=300 but a ledger sum of -826,173 (gap +826,473).
--    Running the reconciliation INSERT blindly would bake those garbage gaps in as
--    real transactions. DO NOT do that. Both the balances and the ledgers are
--    untrustworthy for the historical test accounts; they need human review first.
--
-- RECOMMENDED before any realignment:
--   1. Decide the source of truth per account (most test accounts can be ZEROED).
--   2. Optionally realign ONLY known-good real accounts (e.g. the +500 seed on
--      hydrometricsafrica@gmail.com) with a targeted, reviewed INSERT.
--
-- Dry-run (read-only) — lists every account that does NOT reconcile and the gap:
--   SELECT p.email, p.wallet_balance,
--          COALESCE((SELECT SUM(CASE WHEN t.type IN ('deposit','receive') THEN t.amount ELSE -t.amount END)
--                    FROM public.transactions t WHERE t.user_id=p.id AND t.status='completed'),0) AS ledger_sum,
--          round(p.wallet_balance - COALESCE((SELECT SUM(CASE WHEN t.type IN ('deposit','receive') THEN t.amount ELSE -t.amount END)
--                    FROM public.transactions t WHERE t.user_id=p.id AND t.status='completed'),0),2) AS gap
--   FROM public.profiles p
--   WHERE abs(p.wallet_balance - COALESCE((SELECT SUM(CASE WHEN t.type IN ('deposit','receive') THEN t.amount ELSE -t.amount END)
--                    FROM public.transactions t WHERE t.user_id=p.id AND t.status='completed'),0)) > 0.001
--   ORDER BY abs(gap) DESC;
--
-- Targeted realignment template (fill in :user_id and :gap after review). The
-- balance triggers are disabled so wallet_balance does NOT move — only the ledger
-- gains the row. Positive gap → 'receive' (credit); negative gap → 'adjustment' (debit).
--
--   BEGIN;
--     ALTER TABLE public.transactions DISABLE TRIGGER trigger_update_wallet_balance;
--     ALTER TABLE public.transactions DISABLE TRIGGER trigger_update_balance_status_change;
--     ALTER TABLE public.transactions DISABLE TRIGGER trigger_update_user_pocket_on_insert;
--     ALTER TABLE public.transactions DISABLE TRIGGER trigger_update_user_pocket_on_update;
--     INSERT INTO public.transactions (user_id, type, amount, status, voice_command_text, metadata, created_at, completed_at)
--     VALUES (:user_id, CASE WHEN :gap >= 0 THEN 'receive' ELSE 'adjustment' END, abs(:gap), 'completed',
--             'Opening-balance reconciliation (reviewed)', jsonb_build_object('reason','ledger_realignment_023','gap',:gap), now(), now());
--     ALTER TABLE public.transactions ENABLE TRIGGER trigger_update_wallet_balance;
--     ALTER TABLE public.transactions ENABLE TRIGGER trigger_update_balance_status_change;
--     ALTER TABLE public.transactions ENABLE TRIGGER trigger_update_user_pocket_on_insert;
--     ALTER TABLE public.transactions ENABLE TRIGGER trigger_update_user_pocket_on_update;
--   COMMIT;

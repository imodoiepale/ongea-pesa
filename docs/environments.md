# Environments: test vs live

Every money record carries an `environment` of `test` or `live`. This document is
the contract for keeping that honest.

## The cutover

**2026-08-07.** Everything recorded before that date was development and pilot
activity against real rails, and is labelled `test`:

| Table | test | live at cutover |
|---|---|---|
| `transactions` | 177 | 1 |
| `voice_sessions` | 28 | 0 |
| `mpesa_transactions` | 12 | 1 |
| `gate_transactions` | 0 | 0 (table is unused by app code) |

Nothing was deleted. Wallet balances were zeroed at the cutover and then
reinstated on request; both the zeroing and the restore are rows in
`balance_history`, so the sequence is fully auditable.

## The default is `live`, on purpose

`lib/environment.ts`:

```ts
export const ONGEA_ENV = process.env.ONGEA_ENVIRONMENT === 'test' ? 'test' : 'live'
```

`test` looks like the safer default. It is not.

If a production deploy loses its env var and the default is `test`, real customer
money gets recorded as sandbox data — and it is **invisible**, because every
revenue surface filters to `live`. You would under-report real revenue and have
no signal that it was happening.

With the default at `live`, the same mistake in a preview deploy marks sandbox
traffic as real. That is wrong too, but it is *loud*: the number looks too big
and someone investigates. Prefer the failure mode you will notice.

The DB column default matches (`DEFAULT 'live'`), so a writer that forgets the
field fails the same safe way.

## Configuration

| Deployment | `ONGEA_ENVIRONMENT` |
|---|---|
| Vercel production | `live` (or unset — same result) |
| Vercel preview | `test` |
| Local dev | `test` in `.env.local` |
| `voice-agent` on the VPS | match whichever app it points at |

The LiveKit worker sends its own `environment` in each cost event, so a test
worker pointed at production still records test-labelled costs.

## Reading the data

All three revenue RPCs take `p_environment`, defaulting to `'live'`:

```sql
select * from get_revenue_totals(now() - interval '30 days', now());          -- live
select * from get_revenue_totals(now() - interval '30 days', now(), 'test');  -- test
select * from get_user_economics(now() - interval '30 days', now(), 'live');
select * from get_cost_totals(now() - interval '30 days', now(), 'live');
select * from get_voice_unit_economics(now() - interval '30 days', now(), 'live');
```

`/admin-analytics/economics` has a Live/Test toggle that defaults to Live. When
Test is selected an **amber banner** states that the figures are not real
earnings — because a screen full of plausible numbers with no marker is how a
test figure ends up in a board deck.

## Adding a new money table

1. `environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('test','live'))`
2. Index `(environment, created_at DESC)` — live reporting must not scan the test backlog.
3. Backfill existing rows to `test`, **bounded by the cutover date** so re-running
   the migration cannot relabel legitimately-live rows:
   `WHERE created_at < '2026-08-07T00:00:00Z' AND environment <> 'test'`
4. Every insert in app code passes `environment: ONGEA_ENV`.
5. Any reporting RPC takes `p_environment TEXT DEFAULT 'live'`.

## Sandbox testing with Supabase branches

Supabase branching gives a real isolated Postgres for schema work:

```bash
# via the Supabase MCP
create_branch  { name: "feature-x" }
# apply and verify migrations on the branch, then
merge_branch   { branch_id: "..." }
```

**Branches are a paid Supabase feature.** They bill per branch per hour, so they
are worth it for a risky migration and wasteful for a one-column addition. For
small changes, apply to production and verify immediately with a `SELECT` — which
is what has been done so far in this project, and every migration in
`database/migrations/` is written to be idempotent so a re-run is safe.

## Migrations are applied by hand

There is no Supabase CLI pipeline here. `supabase/migrations/` is empty;
`database/migrations/` is the real directory and files are pasted into the
Supabase SQL editor (or applied via the MCP `apply_migration`).

Consequence worth knowing: **a migration file existing in the repo does not mean
it has been applied.** That is exactly how `device_biometrics_consent_at` came to
be missing while migration 026 claimed to add it — trapping a paying user on the
security-setup screen because the whole `UPDATE` failed on the absent column.
Verify with `information_schema.columns` rather than trusting the file.

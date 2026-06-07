# Ongea Pesa

Voice-first Kenyan fintech PWA. Next.js 15 + Supabase + ElevenLabs Conversational AI + n8n + IndexPay/Gate wallet infra.

---

## ✅ RLS ENABLED — All Core Tables Protected

Migration `015_enable_rls_core.sql` is **applied** (confirmed 2026-06-07). All 21 public tables have RLS on, including:
- `public.profiles` ✅ — owner + service-role policies
- `public.transactions` ✅ — owner + backend-update policy
- `public.subscription_plans` ✅

Server-side routes use `createServiceClient()` (service-role, bypasses RLS). Client routes use `createClient()` (anon key, RLS-bound).

---

## Security & Payment Routing (added)

**Apply migrations in order:** `013_security_events_and_audit.sql`, `014_webauthn_and_lockout.sql`, `015_enable_rls_core.sql`.

**Security model:**
- **PIN** — `profiles.pin_hash` (bcrypt). `POST /api/security/pin/set|verify`.
- **Passkeys (Face/Touch ID)** — WebAuthn via `@simplewebauthn`. Device does the biometric match; we store only a public key in `webauthn_credentials`. **No face/fingerprint data is ever stored server-side.** Endpoints under `/api/security/passkey/*`.
- **Lockout** — `auth_attempts` + `profiles.locked_until/failed_attempts`; 5 fails → 15-min lock (`lib/services/securityService.ts`).
- **Step-up** — verifying PIN/passkey issues a short-lived `stepup_tokens` token; `/api/wallet/send` + `/api/wallet/withdraw` require `stepup_token` before money moves. Client helpers: `lib/security-client.ts`.
- **Audit** — sensitive actions call `logSecurityEvent()` (`lib/services/auditService.ts`) → `security_events`; row changes → `audit_log` triggers. Admin view: `/admin-analytics/security-events`.
- **Voice** — sessions bound to the authenticated user; voice spends still require step-up (full stage→confirm across n8n + client is the next increment).

**Payment routing** — `WalletService.resolveRailAndSend()` chooses the rail: in-app→internal RPC; phone/paybill/till→NCBA Send `/webhook/ncba_withdraw`; utility bill→`/webhook/ncba_bill_pay`; chama payout→Daraja `/webhook/bulk_disburse`.

**Two-balance model:** `profiles.wallet_balance` is the internal ledger (DB trigger debits/credits on `completed` transactions); IndexPay gates/pockets hold chama/escrow funds. External sends insert `processing` (no debit) then flip to `completed` (debit) or `failed` (no debit). Async results reconcile via `POST /api/ncba/callback` (by `provider_ref`) and `POST /api/chama/daraja-callback` (by `conversation_id`), both idempotent.

**New env vars:** `N8N_WEBHOOK_BASE_URL`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, `ADMIN_EMAILS`.

---

## Knowledge Graph (ALWAYS reference before architectural changes)

Run `/graphify` to rebuild. Last built: 2026-06-07.

- `graphify-out/GRAPH_REPORT.md` — overview: **1,869 nodes, 2,350 edges, 341 communities**
- `graphify-out/graph.json` — raw graph data (for `/graphify query` and `/graphify path`)
- `graphify-out/graph.html` — interactive visualization (open in browser)

**God nodes (most-connected):**
| Node | Edges | Meaning |
|---|---|---|
| `cn()` | 81 | Tailwind utility — in every UI component |
| `createClient()` browser | 47 | Supabase browser client |
| `Button Component (CVA)` | 35 | ShadCN button — used across all pages |
| `Supabase MCP Server` | 33 | OngeaPesaMCPServer wiring |
| `profiles` table | 28 | Central user/wallet/gate table |
| `createClient()` server | 26 | Supabase server-side client |
| `Card Component` | 26 | UI shell for every data panel |
| `logSecurityEvent()` | 21 | Audit trail — every sensitive action |
| `ONGEA PESA V2 Agent` | 19 | ElevenLabs voice agent (central hub) |
| `WalletService` | 16 | Payment rail router |

**Core flows (graph hyperedges):**
1. **Voice Transaction**: ElevenLabs Agent → `POST /webhook/send_money` (n8n) → AI Agent parses intent → Supabase write → response
2. **Deposit**: DepositDialog → `POST /api/gate/deposit` → IndexPay STK Push → `useTransactionPolling` → DB update
3. **User Wallet Creation**: Auth Callback → `POST /api/gate/signup` → GateService `createEntityGateAndPocket` → `profiles` table
4. **Chama Bulk Collection**: Create → Add Members → `POST /api/chama/start-collection` → M-Pesa STK Push per member → Poll → Distribute

Use `/graphify query "<question>"` to trace specific flows before touching architecture.

---

## Supabase — ONGEA PESA DEV

**Project ID:** `efydvozipukolqmynvmv`  
**Region:** eu-north-1 (Stockholm)  
**DB:** PostgreSQL 17.6 at `db.efydvozipukolqmynvmv.supabase.co`  
**Status:** ACTIVE_HEALTHY

**Live tables (22 total):**
| Table | RLS | Notes |
|---|---|---|
| `profiles` | ✅ | Owner + service-role policies (migration 015) |
| `transactions` | ✅ | Owner + backend-update policy |
| `subscription_plans` | ✅ | |
| `voice_sessions` | ✅ | |
| `balance_history` | ✅ | |
| `mpesa_transactions` | ✅ | |
| `payment_methods` | ✅ | |
| `contacts` | ✅ | |
| `subscriptions` | ✅ | |
| `escrows` | ✅ | |
| `escrow_participants` | ✅ | |
| `escrow_milestones` | ✅ | |
| `escrow_transactions` | ✅ | |
| `escrow_disputes` | ✅ | |
| `chamas` | ✅ | |
| `chama_members` | ✅ | |
| `chama_projects` | ✅ | |
| `chama_cycles` | ✅ | |
| `chama_stk_requests` | ✅ | |
| `chama_payouts` | ✅ | |
| `gate_transactions` | ✅ | IndexPay gate/pocket transactions |
| `saved_bills` | ✅ | Pay-later bills from scanned receipts (migration 018) |

**Storage:** private `receipts` bucket (5 MB, image/jpeg\|png\|webp); objects RLS scoped to `auth.uid()` folder.

Migrations: `database/migrations/` (001→018, no 003; two `008_*` files — apply both). All applied.

---

## n8n — WALLET SYSTEM Workflow

**Instance:** `https://primary-production-579c.up.railway.app`  
**Key workflow:** WALLET SYSTEM (`r89QfIR0ah2nFHpv`) — **ACTIVE**, 17 trigger count, 145 nodes  
**MCP available:** Yes (this workflow has `availableInMCP: true`)

**Webhook endpoints (all at base URL above):**
| Webhook | Method | Purpose |
|---|---|---|
| `POST /webhook/send_money` | POST | **Main voice payment** — called by ElevenLabs agent |
| `POST /webhook/register_user` | POST | User registration + gate creation |
| `POST /webhook/gate_operations` | POST | Voice gate commands |
| `POST /webhook/check_balance` | POST | AI-parsed balance query |
| `POST /webhook/protection_mode` | POST | Safe word / lock account |
| `POST /webhook/generate_insights` | POST | On-demand analytics |
| `POST /webhook/gate_transfer` | POST | Gate-to-gate transfer |
| `POST /webhook/deposit` | POST | IndexPay deposit trigger |
| `POST /webhook/transfer` | POST | Internal transfer |
| `POST /webhook/balance` | POST | Raw balance fetch |
| `POST /webhook/transactions` | POST | Transaction history |
| `POST /webhook/create-gate` | POST | Create new IndexPay gate |
| `GET /webhook/healthz` | GET | Health check |
| MCP Trigger | — | `/6c8f237c-36b9-4ecf-b2c3-6718feaceaae` |

**Key node stack (145 nodes total):**
- 31 Supabase nodes (reads + writes across all tables)
- 25 Respond-to-Webhook nodes
- 15 Webhook triggers
- 14 HTTP Request nodes (IndexPay API calls)
- 14 Code nodes (business logic)
- 5 AI Agent nodes + 5 Google Gemini models
- 1 Schedule trigger (daily analytics)
- 1 MCP Server trigger

**Other notable workflows:**
| Workflow | Status | ID |
|---|---|---|
| ONGEA PESA | Inactive | `lAzlPAU7BYcspkA7` |
| AI RECEPTIONIST | Active | `mzYSEhidveMmO1IF` |
| KWS WORKFLOW | Active | `QOVnY1CYSCvh6dR5` |
| FILE ON THE GO | Active | `xgCGtU06OsIHuVuw` |

---

## ElevenLabs Voice Agent

**API Key:** configured in `.mcp.json` (`ELEVENLABS_API_KEY`)  
**MCP server:** `uvx elevenlabs-mcp` (starts via Claude Code session)  
**Tools:** `list_agents`, `get_agent`, `update_agent`, `get_conversation`, `list_conversations`

The ElevenLabs agent calls `POST /webhook/send_money` on the n8n WALLET SYSTEM workflow. The agent config (system prompt, voice ID, tool/webhook wiring) can be inspected live once the ElevenLabs MCP connects — check by running `/graphify query "ElevenLabs voice webhook"`.

---

## MCP Connections (3 configured in `.mcp.json`)

| MCP | Transport | Status | Notes |
|---|---|---|---|
| **n8n** | HTTP + OAuth | Requires browser auth each session | Run `mcp__n8n__authenticate` then open URL |
| **ElevenLabs** | stdio (`uvx`) | Auto-starts with session | Tools available once connected |
| **Supabase** | stdio (`npx`) | Auto-starts with session | Token in `.mcp.json` — regenerate at supabase.com/dashboard/account/tokens if expired |

**n8n re-auth:** Call `mcp__n8n__authenticate`, open the returned URL in browser, paste the redirect URL back, call `mcp__n8n__complete_authentication`.

**Quick MCP test commands:**
```
mcp__n8n__search_workflows          → lists all 49 workflows
mcp__supabase__list_projects        → confirms ONGEA PESA DEV is healthy
mcp__supabase__list_tables          → shows 21 live tables + RLS status
```

---

## Local Dev

```bash
npm install
# fill .env.local with your keys first
npm run dev       # turbopack on http://localhost:3000
npm run dev:pwa   # webpack fallback if turbopack errors on Windows
```

**Environment vars needed (`.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY` (Gemini Vision OCR)
- IndexPay credentials (see `.env.local.example` or `lib/services/gateService.ts`)
- n8n webhook URLs (base: `https://primary-production-579c.up.railway.app`)

# Ongea Pesa

Voice-first Kenyan fintech PWA. Next.js 15 + Supabase + ElevenLabs Conversational AI + n8n + IndexPay/Gate wallet infra.

---

## ⚠️ CRITICAL SECURITY — RLS NOT ENABLED

Three tables are fully exposed to any `anon` key holder (no row-level security):
- `public.profiles`
- `public.transactions`
- `public.subscription_plans`

**Do not auto-apply without reviewing policies first — enabling RLS without policies blocks all access.**

```sql
-- Run in Supabase SQL editor ONLY after confirming policies are in place
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
```

---

## Knowledge Graph (ALWAYS reference before architectural changes)

Run `/graphify` to rebuild. Last built: 2026-05-20.

- `graphify-out/GRAPH_REPORT.md` — overview: **1,479 nodes, 1,788 edges, 286 communities**
- `graphify-out/graph.json` — raw graph data (for `/graphify query` and `/graphify path`)
- `graphify-out/graph.html` — interactive visualization (open in browser)

**God nodes (most-connected):**
| Node | Edges | Meaning |
|---|---|---|
| `cn()` | 81 | Tailwind utility — in every UI component |
| `createClient()` browser | 47 | Supabase browser client |
| `Button (CVA)` | 35 | ShadCN button — used across all pages |
| `Supabase MCP Server` | 33 | OngeaPesaMCPServer wiring |
| `profiles` table | 28 | Central user/wallet/gate table |
| `createClient()` server | 26 | Supabase server-side client |
| `Card Component` | 26 | UI shell for every data panel |

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

**Live tables (21 total):**
| Table | RLS | Rows | Notes |
|---|---|---|---|
| `profiles` | ❌ OFF | 1 | **RLS MISSING — see security warning above** |
| `transactions` | ❌ OFF | 11 | **RLS MISSING** |
| `subscription_plans` | ❌ OFF | 0 | **RLS MISSING** |
| `voice_sessions` | ✅ | 0 | |
| `balance_history` | ✅ | 0 | |
| `mpesa_transactions` | ✅ | 0 | |
| `payment_methods` | ✅ | 0 | |
| `contacts` | ✅ | 0 | |
| `subscriptions` | ✅ | 0 | |
| `escrows` | ✅ | 0 | |
| `escrow_participants` | ✅ | 0 | |
| `escrow_milestones` | ✅ | 0 | |
| `escrow_transactions` | ✅ | 0 | |
| `escrow_disputes` | ✅ | 0 | |
| `chamas` | ✅ | 2 | |
| `chama_members` | ✅ | 4 | |
| `chama_projects` | ✅ | 0 | |
| `chama_cycles` | ✅ | 1 | |
| `chama_stk_requests` | ✅ | 2 | |
| `chama_payouts` | ✅ | 0 | |
| `gate_transactions` | ✅ | 0 | IndexPay gate/pocket transactions |

Migrations: `database/migrations/` (001→011, no 003; two `008_*` files — apply both).

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

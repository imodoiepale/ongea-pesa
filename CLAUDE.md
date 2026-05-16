# Ongea Pesa

Voice-first Kenyan fintech PWA. Next.js 16 + Supabase + ElevenLabs Conversational AI + n8n + IndexPay/Gate wallet infra.

## Knowledge graph (ALWAYS reference before architectural changes)

- `graphify-out/GRAPH_REPORT.md` — plain-language overview: 823 nodes, 959 edges, 67 meaningful communities, 11 hyperedges mapping core flows.
- `graphify-out/graph.json` — raw graph data (for `/graphify query` and `/graphify path`).
- `graphify-out/graph.html` — interactive visualization.

**God nodes (most-connected):**
- `cn()` — Tailwind utility, 63 edges (used in every UI component)
- `createClient()` — two Supabase clients (browser + server), 47 + 26 edges
- `OngeaPesaMCPServer` — 12 edges
- `WalletService` / `GateWalletService` — 12/10 edges (dual wallet architecture)

**Core flows (graph hyperedges):**
1. Voice Transaction: ElevenLabs Agent → `/api/voice/webhook` → n8n send_money webhook → Supabase
2. Deposit: DepositDialog → IndexPay STK Push → Transaction Polling Service → DB update
3. User Wallet Creation: Auth Callback → Gate Signup (IndexPay) → `profiles` table
4. Chama Bulk Collection: Create → Add Members → M-Pesa STK Push → Poll → Distribute

Use `/graphify query "<question>"` to trace specific flows before touching architecture.

## Live integrations available via MCP

- **n8n MCP** — `n8n_list_workflows`, `n8n_get_workflow`, `n8n_executions` against `https://primary-production-579c.up.railway.app`
- **ElevenLabs MCP** — `list_agents`, `get_agent` to inspect live system prompts, voice ID, and tool/webhook wiring

## Local dev

```
npm install
# fill .env.local with your keys first
npm run dev       # turbopack on http://localhost:3000
npm run dev:pwa   # webpack fallback if turbopack errors on Windows
```

Supabase migrations: `database/migrations/` (001 → 011, no 003; two 008_* files — apply both).

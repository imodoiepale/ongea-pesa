# Supabase Documentation Reference

Fetched 2026-05-16 for the Ongea Pesa project.

---

## MCP Server

**Package:** `@supabase/mcp-server-supabase` (official, maintained by Supabase team)
**Source:** https://github.com/supabase-community/supabase-mcp

### `.mcp.json` entry (Windows)

```json
"supabase": {
  "command": "cmd",
  "args": [
    "/c", "npx", "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token", "YOUR_PAT_HERE"
  ]
}
```

Optional flags (append to `args`):
- `--read-only` — restrict to read-only SQL (recommended for prod)
- `--project-ref YOUR_REF` — scope to a single project

### Getting credentials

| Credential | Where |
|---|---|
| Personal Access Token (PAT) | Dashboard → avatar (top-right) → **Access Tokens** → Generate |
| Project Reference ID | Dashboard → project → **Settings → General** → "Reference ID" |

### Tools exposed (30+)

| Group | Tools |
|---|---|
| Account | `list_projects`, `get_project`, `create_project`, `pause_project`, `restore_project`, `list_organizations`, `get_organization`, `get_cost`, `confirm_cost` |
| Database | `list_tables`, `list_extensions`, `list_migrations`, `apply_migration`, `execute_sql` |
| Debugging | `get_logs`, `get_advisors` |
| Dev helpers | `get_project_url`, `get_publishable_keys`, `generate_typescript_types` |
| Edge Functions | `list_edge_functions`, `get_edge_function`, `deploy_edge_function` |
| Branching | `create_branch`, `list_branches`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch` |
| Storage | `list_storage_buckets`, `get_storage_config`, `update_storage_config` |
| Docs | `search_docs` |

### Security notes

- Main threat: prompt injection via malicious DB content
- Mitigations: use `--read-only`, scope to dev project with `--project-ref`, restrict feature groups
- Supabase also offers an HTTP MCP endpoint at `https://mcp.supabase.com/mcp` (OAuth) if you prefer that over stdio

---

## JavaScript Client (supabase-js)

**Docs:** https://supabase.com/docs/reference/javascript/introduction

Isomorphic JS library covering:
- **Database:** select, insert, update, upsert, delete (PostgREST)
- **Filtering/modifiers:** eq, neq, gt, lt, in, ilike, etc.
- **Auth:** signup, sign-in (password/magic link/OTP/OAuth), sessions, MFA
- **Edge Functions:** invoke
- **Realtime:** channels, broadcast, presence
- **Storage:** buckets, file upload/download
- **Vector:** embedding indexing and similarity search

---

## Authentication

**Docs:** https://supabase.com/docs/guides/auth

**Supported methods:** Password, magic link, OTP, social login (Google, GitHub, etc.), SSO, custom OAuth2/OIDC.

**Core concepts:**
- Authentication = verifying identity (JWTs)
- Authorization = controlling access (Row Level Security on Postgres)
- User data in dedicated schema; connect to your own tables via triggers and foreign keys
- SDKs auto-attach user tokens to API requests → RLS enforced transparently

**Billing:** Monthly Active Users, SSO users, advanced MFA are separate billing dimensions.

---

## Database

**Docs:** https://supabase.com/docs/guides/database/overview

Every Supabase project gets a **full PostgreSQL** database.

Features:
- Table editor (spreadsheet-like UI)
- Relationship explorer
- Built-in SQL editor with saved queries
- CSV/Excel import
- Extension management from dashboard
- Realtime via Supabase Realtime extension
- Automatic daily backups (note: Storage API *objects* excluded — only metadata backed up)

---

## Realtime

**Docs:** https://supabase.com/docs/guides/realtime

Three features:

| Feature | Use case |
|---|---|
| **Broadcast** | Low-latency ephemeral messages between clients (chat, cursor positions, game events) |
| **Presence** | Track and sync shared user state (who's online, active participants) |
| **Postgres Changes** | Subscribe to live DB INSERT/UPDATE/DELETE events |

**What you can build:** Chat, collaborative docs/whiteboards, live dashboards, multiplayer games, social feeds.

---

## Storage

**Docs:** https://supabase.com/docs/guides/storage

Three bucket types:

| Bucket | Purpose |
|---|---|
| **Files** | Images, videos, documents — CDN delivery + image optimization |
| **Analytics** | Apache Iceberg format — data lakes, ETL pipelines |
| **Vector** | AI embeddings — HNSW/Flat indexing, similarity search |

Features:
- S3-compatible + RESTful APIs + resumable uploads
- Global CDN across 285+ PoPs
- Row-level security for access control
- Files of any size

---

## Ongea Pesa — Supabase usage in this project

| What | How |
|---|---|
| Auth | Email/password via `@supabase/ssr`, sessions via cookies |
| Profiles table | `profiles` — mirrors `auth.users`, includes `phone_number`, `gate_account_id`, `gate_pocket_id` |
| Wallet provisioning | `createClient()` (server) called from auth callback → triggers IndexPay Gate+Pocket creation |
| Chama/escrow data | `chamas`, `chama_members`, `escrows` tables with RLS |
| Transactions | Logged by n8n webhook after M-Pesa STK push |
| Migrations | `database/migrations/001` → `011` (no 003; two 008_* files) |
| MCP server | `supabase` entry in `.mcp.json` — use `execute_sql` / `list_tables` to inspect live schema |

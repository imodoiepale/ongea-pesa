# Ongea Pesa — Voice → Payment System Architecture

> **You say it, we move it.** This document explains exactly how a spoken command becomes a money movement, end-to-end, across ElevenLabs, the Next.js app, n8n, IndexPay/NCBA/Daraja, and Supabase.

Last updated: 2026-05-29. Replaces "the system just works" hand-waving with a precise map of every hop.

---

## 1. Bird's-eye view

```
┌──────────────┐ voice  ┌──────────────────┐ webhook  ┌──────────────────┐
│ User speaks  │──────▶│ ElevenLabs Agent │─────────▶│ ongeapesa.nsait  │
│ "Send 500…"  │        │  (Ongea Pesa)   │          │ /api/voice/webhook│
└──────────────┘        └──────────────────┘          └────────┬─────────┘
                                                                │ forward
                                                                ▼
                                                       ┌──────────────────┐
                                                       │ n8n WALLET SYSTEM│
                                                       │ /webhook/send_money│
                                                       └────────┬─────────┘
                                                                │
                            ┌───────────────────────────────────┼───────────────────────────────────┐
                            ▼                                   ▼                                   ▼
                  ┌──────────────────┐                ┌────────────────────┐               ┌──────────────────┐
                  │ AI Agent (Gemini)│                │ Routing per type   │               │ Supabase write   │
                  │ extracts JSON    │                │ internal / NCBA /  │               │ transactions row │
                  │ from speech      │                │ Daraja / IndexPay  │               │ (status flips)   │
                  └──────────────────┘                └────────┬───────────┘               └──────────────────┘
                                                                │
                            ┌────────────┬─────────────┬────────┴─────────────┬─────────────┐
                            ▼            ▼             ▼                      ▼             ▼
                     ┌──────────┐ ┌──────────┐ ┌─────────────┐         ┌──────────┐ ┌──────────┐
                     │ Internal │ │ IndexPay │ │ NCBA Send   │         │ NCBA Bill│ │ Daraja   │
                     │ Supabase │ │ pocket   │ │ (phone /    │         │ Pay (KPLC│ │ B2C bulk │
                     │   RPC    │ │ transfer │ │  paybill)   │         │ /KRA/…)  │ │ (chamas) │
                     └──────────┘ └──────────┘ └─────────────┘         └──────────┘ └──────────┘
                            ▲                       ▲                       ▲              ▲
                            │                       │ callback              │ callback     │ callback
                            └───────────────────────┴───────────────────────┴──────────────┘
                                  /api/ncba/callback, /api/chama/daraja-callback
                                  → reconcile transactions by provider_ref / conversation_id
```

There are **five rails** money can move on, and one router decides which.

---

## 2. The voice layer — ElevenLabs Agent

### What it is
A Conversational AI agent ("Ongea Pesa") hosted by ElevenLabs. Its job is to *understand intent, extract fields, confirm once, and call one webhook tool*. It does **not** move money itself — it only emits a structured `send_money` call.

### How the user is identified
The agent receives **dynamic variables** at session start (set by our app when it issues the signed URL):

| Variable | Source | Used for |
|---|---|---|
| `user_id` | Supabase auth | Owner of the transaction |
| `user_email` | profiles.email | IndexPay identification |
| `user_name` | profiles | Greeting + summaries |
| `balance` | profiles.wallet_balance | Conversational context ("you have KSh X") |
| `gate_id`, `gate_name` | profiles | IndexPay pocket routing |

These come from `voice_sessions` (table) at agent-start time, so **the speaker is whoever holds the authenticated browser session that minted the signed URL.** That's our voice identity binding.

### The `send_money` tool
Defined on the ElevenLabs side as a **webhook tool** to `https://ongeapesa.nsait.co.ke/api/voice/webhook` (POST, async). Required: `user_id`, `user_email`, `user_name`, `gate_id`, `gate_name`, `summary`. LLM-extracted: `type`, `amount`, `phone`, `till`, `paybill`, `account`, `agent`, `store`, `bankCode`.

`type` is one of:
- **Internal wallet:** `c2c`, `c2b`, `b2c`, `b2b`
- **External M-Pesa:** `send_phone`, `buy_goods_pochi`, `buy_goods_till`, `paybill`, `withdraw`
- **Bank rails:** `bank_to_mpesa`, `bank_to_bank`

The agent system prompt enforces: extract → confirm destination ONCE → execute. No "are you sure" loops.

---

## 3. The bridge — `app/api/voice/webhook/route.ts`

ElevenLabs hits the **Next.js app** (not n8n directly) because:
1. The app holds the Supabase service-role key (n8n shouldn't).
2. The app can verify the **`voice_sessions` binding** for the requesting agent.
3. The app applies the **security gate** (lockout / step-up) before money moves.

The route's job:
1. Receive the `send_money` body from the agent.
2. Resolve the user from `user_id`/email (and, when hardened, from the active `voice_sessions` row).
3. Forward a normalized payload to the n8n `send_money` webhook.
4. Return ElevenLabs' expected JSON shape so the agent can speak the result.

> **Open hardening item (A6 in the security plan):** today this route trusts the `user_id` ElevenLabs sends. The next increment binds it to an authenticated `voice_sessions.session_id` and **stages** money-moving requests pending in-app PIN/passkey confirmation before they reach the rails. The HTTP wallet routes (`/api/wallet/send|withdraw`) already enforce this gate; voice should too.

---

## 4. The n8n WALLET SYSTEM — `POST /webhook/send_money`

Workflow ID `r89QfIR0ah2nFHpv` (Railway) / `CqgzZc7HyvtJQsGT` (new Hostinger). The flow:

```
Webhook ──▶ AI Agent (Gemini, parser + Structured Output) ──▶ Edit Fields
                                                                    │
                                                                    ▼
                                                              Create a row
                                                              (transactions
                                                              status: completed)
                                                                    │
                                                                    ▼
                                                              Respond {status:"Success"}

In parallel from AI Agent: ─▶ 15. send_otp (api_indexpay)
Separately (manual path):   GET SENDER ID ─▶ GET RECEIVER ID ─▶ If(type==send_phone) ─▶ IndexPay pocket transfer
```

### What each node does
| Node | Purpose |
|---|---|
| **Webhook** `/webhook/send_money` | Entry point — receives the payload from `/api/voice/webhook`. |
| **AI Agent** (Gemini) | Re-parses `body.request` (the raw user sentence) into the 14-field strict JSON contract, using `Structured Output Parser` for schema enforcement. |
| **Edit Fields** | Pulls each field out of the AI's `output.*` into typed top-level fields for downstream nodes. |
| **Create a row** (Supabase) | Inserts into `transactions` with `status: completed` and the extracted fields. |
| **GET SENDER ID / GET RECEIVER ID** | Look up sender (`profiles.id == user_id`) and receiver (`profiles.mpesa_number == phone`) for internal in-app transfers. |
| **If `type == send_phone`** | Branches to the IndexPay pocket-to-pocket transfer (`get_transactions_2.php` with `pocket_from_id` = sender gate, `pocket_to_id = 529`). |
| **15. send_otp** | Triggers an IndexPay OTP to `0743854888` (the operator/admin phone) on every transaction — currently a notification side-channel. |
| **Respond to Webhook** | Returns `{status:"Success"}` to ElevenLabs. |
| **Webhook2 `/webhook/healthz`** | Liveness probe. |

### ⚠️ Two important truths about this workflow as it stands
1. **`status: completed` is written immediately** — even for external rails (paybill, till, bank). The transaction row is optimistic; nothing in this workflow actually calls NCBA or Daraja for those types. Only `send_phone` → IndexPay pocket fires a real movement, and even there the row is already `completed` regardless of the IndexPay response.
2. **No step-up authentication** runs before the insert/transfer — the workflow trusts whatever the agent says.

The **NCBA Send**, **NCBA Bill Pay**, **Daraja** workflows we built (next section) are how this becomes real, end-to-end. Hooking them into the WALLET SYSTEM is the next step (see §8).

---

## 5. The rail workflows (real money movers)

Four separate n8n workflows handle actual settlement:

### 5.1 NCBA Send — `/webhook/ncba_withdraw` (`xjG51cY41GHarQFu`)
- **Phone:** `MobileMoneyTransfer/mobilemoneytransfer` (Bank-to-Wallet, KES 50–250k). Strips `+`, normalizes to `254…`.
- **Paybill/Till:** `LipaNaMpesaValidation/accountdetails` → `LipaNaMpesa/lipanampesa`.
- Auth: `/api/v1/Auth/generate-token` → Bearer `accessToken` + `Ocp-Apim-Subscription-Key`.
- Returns `{ success, bankRef, raw }` from the sync response.

### 5.2 NCBA Bill Pay — `/webhook/ncba_bill_pay` (`O5vCG0FLFMqGNL5R`)
- Bills: KPLC, KRA, NHIF, NWSC (validate → pay pairs).
- Each payment carries `callbackUrl` → `/webhook/ncba_bill_result` (n8n receiver, forwards to `/api/ncba/callback`).
- KPLC prepaid returns the token in the callback.

### 5.3 Daraja Safaricom — `/webhook/bulk_disburse` + result/timeout
- Daraja v1 B2C for chama bulk payouts. `app/api/chama/distribute` calls it; `conversation_id` is stored on `chama_payouts`; callback (`/api/chama/daraja-callback`) reconciles by `conversation_id`.

### 5.4 IndexPay gates/pockets (legacy)
- `aps.co.ke/indexpay/api/get_transactions_2.php` — the internal pocket ledger NCBA Pesa originally used. Still active for in-app pocket transfers and chama gates.

---

## 6. The Next.js app surface

| Route | Purpose |
|---|---|
| `POST /api/wallet/send` | Internal in-app transfer (auth + step-up + atomic RPC `process_internal_transfer`). |
| `POST /api/wallet/withdraw` | External send to phone (auth + step-up + NCBA Send via `/webhook/ncba_withdraw`). |
| `POST /api/voice/webhook` | ElevenLabs bridge → n8n WALLET SYSTEM. |
| `POST /api/ncba/callback` | NCBA async results → updates `transactions` by `provider_ref`. Idempotent. |
| `POST /api/chama/daraja-callback` | Daraja B2C results → updates `chama_payouts` + `transactions` by `conversation_id`. Idempotent. |
| `POST /api/chama/distribute` | Initiates real Daraja `bulk_disburse` (the `SIM_` mock is gone). |
| `POST /api/security/pin/{set,verify}` | PIN management → issues step-up token on success. |
| `POST /api/security/passkey/{register,auth}/{options,verify}` | Face/Touch ID via device WebAuthn. Issues step-up token. |
| `GET /api/admin/security-events` | Admin-only audit feed. |

`WalletService.resolveRailAndSend()` in `lib/services/walletService.ts` is the single decision point that picks the rail and records `provider`/`provider_ref` for callback reconciliation.

---

## 7. The data model (Supabase) — what each table represents

| Table | Role |
|---|---|
| `profiles` | One row per user. Holds **`wallet_balance`** (internal ledger), `pin_hash`, `biometric_enabled`, `failed_attempts`, `locked_until`, IndexPay `gate_id`/`gate_name`. |
| `transactions` | Every money movement. `type` (12 enum values), `status` (`pending`/`processing`/`completed`/`failed`/`timeout`), **`provider`** (`ncba`/`safaricom_b2c`/`indexpay`), **`provider_ref`** (matches back to NCBA `bankRef` / Daraja `ConversationID`). |
| `voice_sessions` | Active ElevenLabs agent sessions, bound to `user_id`. The cryptographic anchor for voice identity. |
| `chama_payouts` | Outbound chama disbursements with `conversation_id` for Daraja reconciliation. |
| `webauthn_credentials` | Public keys for device passkeys. **No biometric data — only public keys.** |
| `auth_attempts`, `stepup_tokens`, `security_events`, `audit_log` | The audit/security spine added in migrations 013–015. |

**The two-balance model:** `profiles.wallet_balance` is the internal source of truth (DB trigger debits/credits on `completed` transactions). IndexPay gates hold chama/escrow funds separately. External sends insert `processing` → flip to `completed` (debit) or `failed` (no debit) via callback — so the wallet is never debited for money that didn't leave.

---

## 8. End-to-end example: "Tuma 500 to 0712345678"

1. User speaks → ElevenLabs agent recognizes `send_phone` intent.
2. Agent emits `send_money` webhook to `https://ongeapesa.nsait.co.ke/api/voice/webhook` with `{user_id, gate_id, type:"send_phone", phone:"0712345678", amount:"500", summary, …}`.
3. `/api/voice/webhook` validates the active `voice_sessions` row → forwards to n8n `/webhook/send_money`.
4. n8n **WALLET SYSTEM** AI Agent re-parses, `Edit Fields` normalizes, `Create a row` inserts a `transactions` record.
5. *(Coming next — see §9 gap):* the workflow calls `/webhook/ncba_withdraw` `destinationType:"phone"` → NCBA mobilemoneytransfer fires → `bankRef` returned.
6. The transaction row flips from `processing` → `completed` (DB trigger debits `wallet_balance`).
7. `Respond to Webhook` returns success → ElevenLabs voices "Pesa imefika!".

---

## 9. Known gaps (truthful tracking)

| Gap | Where | Status |
|---|---|---|
| **WALLET SYSTEM optimistically writes `completed`** for all types, without calling NCBA/Daraja for external rails. | n8n `WALLET SYSTEM` → `Create a row` | Open. Plan: route the `Edit Fields` output through `resolveRailAndSend()` (call the right rail webhook, insert `processing`, flip on response/callback). |
| **No voice step-up.** Voice → money moves with no PIN/passkey check. HTTP wallet routes already gate; voice doesn't yet. | `/api/voice/webhook` + WALLET SYSTEM | Open (A6 in security plan). |
| **NCBA LNM payment URL was a best-guess** until Jemalel sent the real one (`/api/v1/LipaNaMpesa/lipanampesa`). Now live. | `lib/services/walletService.ts` constants in n8n NCBA Send | Closed. |
| **NCBA UAT password** intermittently returns 401 from `generate-token` after subscription updates. | NCBA side. | Awaiting NCBA confirmation/reset. |
| **`MpesaB2WValidation` returns 404** for our subscription key. | NCBA side. | Awaiting enablement; payment uses `MobileMoneyTransfer/mobilemoneytransfer` (no separate validate call) — works once NCBA whitelists the test number. |
| **Send-OTP node fires for every transaction** to a single hardcoded phone (`0743854888`). | n8n WALLET SYSTEM `15. send_otp` | Open — replace with per-user step-up OTP or remove. |

---

## 10. Hosting migration — Railway → Hostinger n8n

You've moved the n8n stack to `https://n8n-lc5r.srv1631847.hstgr.cloud`. To complete the cutover safely:

1. **Update `N8N_WEBHOOK_BASE_URL`** in `.env.local` (and Vercel / production env) to the new host. Currently `walletService.ts` falls back to the Railway URL.
2. **Update NCBA callback URL** (in `Build Bill Config`) from `https://primary-production-579c.up.railway.app/webhook/ncba_bill_result` → new host.
3. **Update Daraja `ResultURL` / `QueueTimeOutURL`** in your Daraja workflow constants to the new host.
4. **Re-fetch the egress IP** on Hostinger (the Railway one `162.220.232.144` won't apply) by hitting the new instance's `/webhook/egress_ip` utility workflow, and submit it to NCBA for whitelisting (the production agreement lists `162.220.232.144` + `76.13.53.26` — replace whichever Hostinger uses).
5. **Store the new n8n API key as `N8N_API_KEY`** in the app/env — never commit it. (You pasted it in chat; rotate it after onboarding finishes if it's been exposed.)
6. **Keep Railway running in parallel** for a day, route only Manual Tests to Hostinger first, then flip the ElevenLabs tool URL and the app env to point exclusively at Hostinger.

---

## 11. TL;DR

- **Brain:** ElevenLabs agent — understands intent, never moves money.
- **Bridge:** `/api/voice/webhook` — authenticates the speaker, forwards to n8n.
- **Heart:** n8n WALLET SYSTEM (`send_money`) — parses, decides, writes `transactions`.
- **Muscles:** NCBA Send / NCBA Bill Pay / Daraja / IndexPay — the four rails that actually move funds.
- **Memory:** Supabase — `profiles.wallet_balance` is the internal ledger; `transactions` records every movement with `provider`/`provider_ref` for callback reconciliation; `security_events` + `audit_log` are the immutable trail.
- **Guardrails:** PIN, WebAuthn passkeys, lockout, step-up tokens, idempotent callbacks — all live for HTTP routes; voice path is next.

You say it, we move it. The rest of this doc explains *exactly how*.

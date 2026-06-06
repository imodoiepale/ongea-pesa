# ElevenLabs Client Tools + Vision OCR — Setup Guide

> **Agent:** ONGEA PESA V2 · `agent_5301kbp2gvypf0m83e579ya9nz75`
> **Updated:** 2026-06-06

---

## 1. Architecture — Voice ↔ Vision ↔ Wallet

```
User speech
  │
  ▼
ElevenLabs Conversational AI (ONGEA PESA V2)
  │
  ├── CLIENT TOOLS (run on the user's device via @elevenlabs/react)
  │     ├── open_scanner  ──► contexts/ElevenLabsContext.tsx (toolHandlersRef.openScanner)
  │     │                       └── navigates to "scanner" screen in app.tsx
  │     ├── start_scan    ──► toolHandlersRef.startScan(mode?)
  │     │                       └── payment-scanner.tsx captures frame
  │     │                           └── POST /api/scan/ocr  ←── OpenAI GPT-4o (15 s)
  │     │                                                    ←── Gemini 2.5-flash-lite (20 s fallback)
  │     │                               └── PaymentScanResult (lib/ocr-shared.ts)
  │     │                                   sendContextualUpdate → agent speaks result
  │     ├── confirm_payment ──► toolHandlersRef.confirmPayment()
  │     │                         └── POST /api/wallet/pay
  │     │                               └── WalletService.resolveRailAndSend
  │     │                                     ├── internal → Supabase RPC
  │     │                                     └── external → NCBA /webhook/ncba_withdraw
  │     └── read_balance  ──► toolHandlersRef.getBalance()
  │                             └── returns wallet_balance from profile
  │
  └── WEBHOOK TOOL (server-side, async/immediate)
        send_money  ──► POST /api/voice/webhook
                          └── n8n WALLET SYSTEM workflow (145 nodes)
                              └── Supabase write + IndexPay/NCBA/Daraja rails
```

### Parallel voice-typed-send path

```
User: "Send 500 to John" (speech only, no scan)
  ▼
ElevenLabs → send_money webhook → /api/voice/webhook → n8n → Supabase
```

---

## 2. The 4 Client Tools

All tools are `type: "client"` — they run **on the user's browser/device**, not on a server. The ElevenLabs agent calls them; the React `clientTools` map in `contexts/ElevenLabsContext.tsx:101` handles execution.

### 2a. Tool JSON (copy-paste for ElevenLabs dashboard)

#### open_scanner

```json
{
  "tool_config": {
    "type": "client",
    "name": "open_scanner",
    "description": "Open the in-app camera/scanner so the user can scan a payment target (till, paybill, QR, phone, or receipt). Call when the user asks to scan, 'piga hii', 'soma hii', or 'use the camera'.",
    "expects_response": true,
    "response_timeout_secs": 20,
    "parameters": {
      "type": "object",
      "required": [],
      "properties": {}
    }
  }
}
```

#### start_scan

```json
{
  "tool_config": {
    "type": "client",
    "name": "start_scan",
    "description": "Start scanning the camera image. The image is read by Vision OCR which returns the payment type, numbers and amount. Omit mode (or \"auto\") to auto-detect any document.",
    "expects_response": true,
    "response_timeout_secs": 20,
    "parameters": {
      "type": "object",
      "required": [],
      "properties": {
        "mode": {
          "type": "string",
          "description": "Scan mode. Omit or pass \"auto\" for auto-detection. Options: auto, till, paybill, send_phone, withdraw, bank_to_mpesa, bank_to_bank, qr, receipt",
          "enum": ["auto", "till", "paybill", "send_phone", "withdraw", "bank_to_mpesa", "bank_to_bank", "qr", "receipt"]
        }
      }
    }
  }
}
```

#### confirm_payment

```json
{
  "tool_config": {
    "type": "client",
    "name": "confirm_payment",
    "description": "Confirm and send the payment currently displayed from the last scan, routing it through the user's wallet. Only call after the user agrees.",
    "expects_response": true,
    "response_timeout_secs": 20,
    "parameters": {
      "type": "object",
      "required": [],
      "properties": {}
    }
  }
}
```

#### read_balance

```json
{
  "tool_config": {
    "type": "client",
    "name": "read_balance",
    "description": "Return the user's current Ongea Pesa wallet balance.",
    "expects_response": true,
    "response_timeout_secs": 20,
    "parameters": {
      "type": "object",
      "required": [],
      "properties": {}
    }
  }
}
```

### 2b. Where they map in the codebase

| Agent tool name  | Client handler (ElevenLabsContext.tsx:101) | Delegate (registered via registerToolHandlers) |
|------------------|---------------------------------------------|------------------------------------------------|
| `open_scanner`   | calls `toolHandlersRef.current.openScanner?.()` | `app.tsx:49` → `navigate('scanner')` |
| `start_scan`     | calls `toolHandlersRef.current.startScan?.(mode)` | `payment-scanner.tsx` → camera capture → `/api/scan/ocr` |
| `confirm_payment`| calls `toolHandlersRef.current.confirmPayment?.()` | `payment-scanner.tsx` → `/api/wallet/pay` |
| `read_balance`   | calls `toolHandlersRef.current.getBalance?.()` | `payment-scanner.tsx` returns live balance |

> **Tool names are case-sensitive.** `open_scanner` ≠ `Open_Scanner`. The agent-side name must match the `clientTools` map key exactly.

---

## 3. How to Apply

### Method A — Automated script (recommended)

```bash
# From project root
node scripts/configure-elevenlabs-agent.mjs

# Skip making send_money synchronous (not recommended with the new prompt)
node scripts/configure-elevenlabs-agent.mjs --no-fix-send-money
```

The script is **idempotent**: re-running it updates existing tools instead of creating duplicates. It GETs the current agent state first and appends to `tool_ids` rather than replacing them.

**API key resolution** (in order):
1. `ELEVENLABS_API_KEY` environment variable
2. `.mcp.json` → `mcpServers.elevenlabs.env.ELEVENLABS_API_KEY`

### Method B — ElevenLabs dashboard (manual)

1. Go to [elevenlabs.io/app/conversational-ai/tools](https://elevenlabs.io/app/conversational-ai/tools)
2. Click **New Tool → Client tool**
3. For each of the 4 tools above: paste the `tool_config` JSON fields into the form
4. Save each tool and note its Tool ID
5. Go to your agent → **Tools** tab → **Add tool** → select each of the 4 client tools
6. Verify the tool list shows 5 tools total (send_money + 4 client tools)
7. Apply the system prompt below in the agent's **System Prompt** field

---

## 4. System Prompt (full — Part C + Scan-to-Pay)

Apply this in the agent's **System Prompt** field. It replaces the existing 18k-char prompt and fixes the fee/free-send contradictions (single reference: 0.5% / 20 free sends).

```
# Ongea Pesa — Voice Wallet Assistant

## Identity
You are Ongea Pesa — Kenya's fast voice wallet assistant for {{user_name}}. You operate an INTERNAL WALLET system (not M-Pesa directly). Speak Kenyan English + Kiswahili mix (Sheng). Be brief, warm, and action-first.

## User Context
- **Name:** {{user_name}}
- **Wallet balance:** KSh {{balance}}
- **Gate:** {{gate_name}} (ID: {{gate_id}})
- **User ID:** {{user_id}} | **Email:** {{user_email}}

## Wallet System — The Facts (cite these, nothing else)
- Money moves FROM {{user_name}}'s Ongea Pesa wallet
- **Internal transfers** (to other Ongea Pesa users/businesses): instant; **0.5% fee** or FREE for subscribers
- **Subscriber plan:** KES 5,000/month = **20 free sends per month** (amounts >= KES 1,000)
- **External M-Pesa** (till/paybill/phone/withdraw): standard Safaricom charges apply
- Single transaction maximum: KES 999,999

## Transaction Types

| Type | Trigger words | Required fields |
|------|---------------|-----------------|
| c2c | "send to [name/phone/email]", "tuma pesa kwa..." | amount, recipient |
| c2b | "pay [business]" (Ongea Pesa biz) | amount, recipient |
| b2c | "send to customer from business" | amount, recipient |
| b2b | "business to business" | amount, recipient |
| send_phone | "send to 07...", "tuma M-Pesa kwa nambari" | amount, phone |
| buy_goods_pochi | "pochi", "buy goods pochi" | amount, phone |
| buy_goods_till | "till [number]", "lipa till" | amount, till |
| paybill | "paybill", "lipa bill [number]" | amount, paybill, account |
| withdraw | "withdraw", "toa pesa", "cash out" | amount, agent, store |
| bank_to_mpesa | "bank to mpesa" | amount, bankCode, account |
| bank_to_bank | "bank transfer to..." | amount, bankCode, account |

**recipient** = email, username, or phone of an Ongea Pesa user (c2c/c2b/b2c/b2b)
**phone** = Kenyan number 07XXXXXXXX or 254XXXXXXXXX (external M-Pesa only)

## Execution Protocol

1. **Extract** all transaction details from speech automatically
2. **Ask** for missing required fields — one at a time, direct questions only
3. **Confirm destination once** in natural language:
   - "Sending KSh [amount] to [recipient] from your wallet, sawa?"
   - "Paying KSh [amount] to till [number] from your wallet, right?"
   - "Paybill [number] account [number], KSh [amount] — confirm?"
4. **STEP-UP RULE (high value):** For amounts > KES 20,000 to a recipient not mentioned earlier in this call, add ONE line: "That is a big one — KSh [amount] to [recipient]. Are we good?" Accept yes/ndiyo/sawa/yeah/correct then proceed immediately.
5. **Execute** — call send_money tool immediately upon confirmation
6. **Respond** using the tool result (see below)

## Responding After send_money

### On success (tool returns success: true)
Speak a warm Kenyan confirmation. If data.message contains useful info, use it; otherwise freestyle:
- Internal: "Done! Pesa imefika [recipient] wallet." / "Sent to [recipient], boss!"
- External till: "Paid! KSh [amount] imeenda till [number] from your wallet."
- Paybill: "Bill imelipwa! KSh [amount] to [paybill] — safi kabisa."
- Withdraw: "Withdrawn! Collect KSh [amount] from the agent."
- If free transaction in response: "Done! No charge — free transaction!"
- If free_sends_remaining in response: "You have [N] free sends left this month."

**Do NOT claim a specific post-transaction balance** — you only know the balance at call start ({{balance}}). The new balance is not returned by the system.

### On error (tool returns success: false)
Speak the agent_message field verbatim — it is written for you to say aloud.
If agent_message is not present:
- Insufficient funds: "Sorry boss, your wallet has KSh {{balance}} but you need KSh [amount]. Want to load from M-Pesa first?"
- Recipient not found: "Hmm, cannot find that person on Ongea Pesa — try their email or phone?"
- Self-transfer: "You cannot send to yourself, boss!"
- Amount too large: "Max is KSh 999,999 per transaction."
- Generic: "Transaction failed — try again au niulize?"

## Language and Style
- Mix English + Kiswahili naturally: "Done!", "Pesa imefika!", "Sawa!", "Tumeshinda!"
- 1-2 sentences after completing a transaction — no lengthy summaries
- Speak numbers clearly: "five thousand" not "5000" for confirmation
- "from your wallet" (internal transfers) / "from your wallet to M-Pesa" (external)

## Hard Rules

DO:
- Ask once per missing field, then move on
- Confirm destination exactly once
- Step-up confirm once for > KES 20,000 new recipients
- Say "from your wallet" on every send

DO NOT:
- Ask "Are you sure?" / "Proceed?" / "Confirm transaction?" for standard amounts
- State a post-transaction balance (you do not have it)
- Say "from your M-Pesa" (it is the WALLET)
- Say "to their M-Pesa" for internal transfers (it is their WALLET)
- Call send_money before confirming destination

## Emergency Commands

| Command | Action |
|---------|--------|
| "Cancel" / "Stop" / "Do not send" | Abort — do NOT call tool. Say: "Sawa, tumesimama." |
| "Balance" / "How much do I have?" | Say: "Your wallet has KSh {{balance}}." |
| "Help" | Briefly list: internal wallet transfers, external M-Pesa payments, withdrawals |
| "Repeat" | Repeat last response |
| "Subscription" | Say: "KES 5,000/month = 20 free sends. Current fee: 0.5% per internal send." |
| "How to load" / "Deposit" | Say: "Use the Ongea Pesa app to load from M-Pesa to your wallet." |

## Scan-to-Pay (Voice + Camera + Vision)

You can see through the user's camera. When they want to pay something in front of them — a till sticker, paybill, QR code, phone number, or a receipt — drive the scanner with these CLIENT tools (they run on the user's device, not a webhook):

- open_scanner — opens the camera/scanner screen. Call when the user says "scan this", "piga hii", "soma hii", "open camera", or "use the camera".
- start_scan({ mode }) — starts a scan. mode is optional: omit or "auto" to auto-detect ANY document, or pass one of: till, paybill, send_phone, withdraw, bank_to_mpesa, bank_to_bank, qr, receipt. Our Vision OCR (OpenAI GPT-4o, Gemini fallback) reads the image and returns the payment type, numbers, and amount.
- confirm_payment — confirms and sends the currently displayed scan result through the wallet (same rails as send_money). Only call AFTER the user agrees.
- read_balance — returns the user's current wallet balance.

Flow:
1. "Scan this till" → call open_scanner, then start_scan (mode "till", or auto).
2. Vision OCR runs and the detected target is fed back to you (till/paybill/amount).
3. Read it back: "I see Till 832909, KSh 500 — pay it?"
4. On yes/sawa/ndiyo → call confirm_payment. It routes through the wallet.
5. If it is a receipt with no payable till/paybill, just summarize the expense — do NOT pay.

Notes:
- If the amount was not on the document, take it from the user's speech.
- Vision reads digits character-by-character; if confidence is low, ask the user to confirm the digits before paying.
```

---

## 5. send_money Tool Upgrades

The script also upgrades `send_money` from `execution_mode: async` to `immediate` and adds a response body schema. This is required for the new prompt's "Responding After send_money" section to work — the agent needs to receive and parse the webhook response to speak fees, errors, and `agent_message` aloud.

### What changes

| Setting | Before | After |
|---------|--------|-------|
| `execution_mode` | `async` | `immediate` |
| `response_body_schema` | `null` | D3 schema (see `docs/ELEVENLABS_AGENT_CONFIG.md`) |
| `description` | "Sends the details of a transaction " (trailing space) | Updated with full capability description |

### Fee/subscription assumption

The prompt uses **0.5% fee** and **20 free sends/month**. This matches `calculateTransactionFees` in `app/api/voice/send-scan-data/route.ts`. Confirm with the backend team before going to full production.

### Skip the upgrade

```bash
node scripts/configure-elevenlabs-agent.mjs --no-fix-send-money
```

---

## 6. Environment Requirements

| Variable | Required for | Where to set |
|----------|-------------|-------------|
| `ELEVENLABS_API_KEY` | Running the configure script | `.env.local` or shell |
| `OPENAI_API_KEY` | Vision OCR primary provider (`/api/scan/ocr`) | `.env.local` |
| `GEMINI_API_KEY` | Vision OCR fallback provider | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase reads | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side wallet ops | `.env.local` |

Without `OPENAI_API_KEY` and `GEMINI_API_KEY`, the scanner opens but `/api/scan/ocr` returns 503. The voice session continues; only the scan result is missing.

---

## 7. Verification

### Script run

```bash
node scripts/configure-elevenlabs-agent.mjs
# Expected: exits 0, prints "🎉 Configuration applied successfully!"
# Shows 5 tool_ids, prompt length > 3000 chars, Scan-to-Pay section present
```

### Read back via MCP

```
mcp__elevenlabs__get_agent  (agent_id: agent_5301kbp2gvypf0m83e579ya9nz75)
```

Confirm:
- `conversation_config.agent.prompt.tool_ids` has **5 entries** (send_money + 4 client tools)
- `conversation_config.agent.prompt.prompt` contains `"Scan-to-Pay"`
- `conversation_config.agent.first_message` = `"Niaje {{user_name}}!..."`

### End-to-end voice test

```bash
npm run dev
```

1. Open Voice page → start a session
2. Say **"scan this till"** → camera screen should open (console: `openScanner handler fired`)
3. Point at a till sticker → OCR runs → agent reads back "I see Till XXXXXX"
4. Say **"yes"** → payment goes through `/api/wallet/pay`
5. Say **"what is my balance?"** → agent calls `read_balance` → speaks wallet balance

### OCR sanity check

```bash
curl -X POST http://localhost:3000/api/scan/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageData":"<base64_jpeg>","scanMode":"auto"}'
# Expected: {"type":"buy_goods_till","data":{"till":"XXXXXX"},"confidence":95,...}
```

---

## 8. Rollback

To remove the 4 client tools and revert to only `send_money`:

```bash
curl -sX PATCH https://api.elevenlabs.io/v1/convai/agents/agent_5301kbp2gvypf0m83e579ya9nz75 \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conversation_config":{"agent":{"prompt":{"tool_ids":["tool_1201kc61sfd5f2kb453gred5j7dj"]}}}}'
```

The original prompt is archived verbatim in `docs/ELEVENLABS_AGENT_CONFIG.md` section A10.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Agent says "I cannot open the camera" | Client tools not in agent's `tool_ids` | Re-run the configure script; verify 5 tool_ids |
| Camera opens but OCR times out | `OPENAI_API_KEY` / `GEMINI_API_KEY` not set | Add to `.env.local` |
| Agent doesn't speak fee/error details | `send_money` still `execution_mode: async` | Run script without `--no-fix-send-money` |
| `read_balance` returns 0 | Balance fetch interval in `ElevenLabsContext` hasn't fired | Wait ~10 seconds; checks every 10s |
| `confirm_payment` does nothing | `payment-scanner.tsx` handler not registered | Ensure scanner screen is open when agent calls it |
| Script exits with 403 | Wrong/expired API key | Check `.env.local` or `.mcp.json` |

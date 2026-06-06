#!/usr/bin/env node
// scripts/configure-elevenlabs-agent.mjs
// Idempotent: creates or patches the 4 ElevenLabs client tools, then patches
// the ONGEA PESA V2 agent with the world-standard prompt + Scan-to-Pay section.
//
// Usage:
//   node scripts/configure-elevenlabs-agent.mjs
//   node scripts/configure-elevenlabs-agent.mjs --no-fix-send-money
//
// Env priority: ELEVENLABS_API_KEY env var → .mcp.json → exit with error

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const AGENT_ID       = 'agent_5301kbp2gvypf0m83e579ya9nz75';
const SEND_MONEY_ID  = 'tool_1201kc61sfd5f2kb453gred5j7dj';
const BASE_URL       = 'https://api.elevenlabs.io';

const fixSendMoney = !process.argv.includes('--no-fix-send-money');

// ─── API key resolution ────────────────────────────────────────────────────────

function resolveApiKey() {
  const envKey = process.env.ELEVENLABS_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  try {
    const mcp = JSON.parse(readFileSync(join(ROOT, '.mcp.json'), 'utf8'));
    const key = mcp?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY;
    if (key && key.trim()) return key.trim();
  } catch { /* .mcp.json missing or malformed */ }

  console.error('❌ ELEVENLABS_API_KEY not found in process.env or .mcp.json');
  console.error('   Set it: export ELEVENLABS_API_KEY=sk_... (or fill .env.local)');
  process.exit(1);
}

const API_KEY = resolveApiKey();

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function el(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

// ─── World-standard prompt (Part C) + Scan-to-Pay section ────────────────────

const SYSTEM_PROMPT = `# Ongea Pesa — Voice Wallet Assistant

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
- Vision reads digits character-by-character; if confidence is low, ask the user to confirm the digits before paying.`;

const FIRST_MESSAGE = 'Niaje {{user_name}}! Ongea Pesa hapa — una KSh {{balance}} kwa wallet. Nani tunatumia leo?';

// ─── 4 client tool definitions ────────────────────────────────────────────────

const CLIENT_TOOLS = [
  {
    name: 'open_scanner',
    description: "Open the in-app camera/scanner so the user can scan a payment target (till, paybill, QR, phone, or receipt). Call when the user asks to scan, 'piga hii', 'soma hii', or 'use the camera'.",
    expects_response: true,
    response_timeout_secs: 20,
    parameters: { type: 'object', required: [], properties: {} },
  },
  {
    name: 'start_scan',
    description: 'Start scanning the camera image. The image is read by Vision OCR which returns the payment type, numbers and amount. Omit mode (or "auto") to auto-detect any document.',
    expects_response: true,
    response_timeout_secs: 20,
    parameters: {
      type: 'object',
      required: [],
      properties: {
        mode: {
          type: 'string',
          description: 'Scan mode. Omit or pass "auto" for auto-detection. Options: auto, till, paybill, send_phone, withdraw, bank_to_mpesa, bank_to_bank, qr, receipt',
          enum: ['auto', 'till', 'paybill', 'send_phone', 'withdraw', 'bank_to_mpesa', 'bank_to_bank', 'qr', 'receipt'],
        },
      },
    },
  },
  {
    name: 'confirm_payment',
    description: "Confirm and send the payment currently displayed from the last scan, routing it through the user's wallet. Only call after the user agrees.",
    expects_response: true,
    response_timeout_secs: 20,
    parameters: { type: 'object', required: [], properties: {} },
  },
  {
    name: 'read_balance',
    description: "Return the user's current Ongea Pesa wallet balance.",
    expects_response: true,
    response_timeout_secs: 20,
    parameters: { type: 'object', required: [], properties: {} },
  },
];

// ─── send_money response schema (D3) ─────────────────────────────────────────

const SEND_MONEY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'true if transaction was submitted to n8n successfully' },
    message: { type: 'string', description: "Generic status message, e.g. 'Transaction processed successfully'" },
    transaction_id: { type: 'string', description: 'Transaction ID returned from n8n (present on success)' },
    data: { type: 'object', description: 'Full n8n response payload. May contain platform_fee, free_tx_remaining, is_free_transaction.' },
    agent_message: { type: 'string', description: 'Natural-language message written for the agent to speak aloud. Speak this verbatim when present.' },
    error: { type: 'string', description: "Error type when success=false: 'Insufficient funds', 'Amount too large', 'Invalid amount'" },
    current_balance: { type: 'string', description: 'User wallet balance in KES at time of error' },
    required_amount: { type: 'string', description: 'Amount the user attempted to send' },
    shortfall: { type: 'string', description: 'How much the user is short' },
    platform_fee: { type: 'string', description: 'Platform fee that would have been charged' },
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧  Ongea Pesa — ElevenLabs Agent Configurator');
  console.log('='.repeat(54));
  console.log(`    Agent : ${AGENT_ID}`);
  console.log(`    Mode  : fix-send-money = ${fixSendMoney}`);

  // Step 1: GET agent — read current tool_ids so we never clobber send_money
  console.log('\n[1] Fetching current agent state...');
  const agent = await el('GET', `/v1/convai/agents/${AGENT_ID}`);
  const existingToolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  console.log(`    Existing tool_ids (${existingToolIds.length}): ${existingToolIds.join(', ')}`);

  // Step 2: GET workspace tools — build name→id map for idempotency
  console.log('\n[2] Fetching workspace tools...');
  const toolsResp = await el('GET', '/v1/convai/tools');
  const allTools = toolsResp.tools ?? [];
  const toolByName = {};
  for (const t of allTools) {
    const name = t.tool_config?.name ?? t.name;
    if (name) toolByName[name] = t.id ?? t.tool_id;
  }
  const existing4 = CLIENT_TOOLS.map(t => t.name).filter(n => toolByName[n]);
  console.log(`    Workspace tools: ${allTools.length} total`);
  console.log(`    Already-existing client tools: ${existing4.length > 0 ? existing4.join(', ') : 'none'}`);

  // Step 3: Create / PATCH the 4 client tools
  console.log('\n[3] Creating / updating 4 client tools...');
  const clientToolIds = [];

  for (const def of CLIENT_TOOLS) {
    const body = {
      tool_config: {
        type: 'client',
        name: def.name,
        description: def.description,
        expects_response: def.expects_response,
        response_timeout_secs: def.response_timeout_secs,
        parameters: def.parameters,
      },
    };

    let toolId;
    if (toolByName[def.name]) {
      toolId = toolByName[def.name];
      process.stdout.write(`    PATCH  ${def.name.padEnd(18)} (${toolId}) ... `);
      await el('PATCH', `/v1/convai/tools/${toolId}`, body);
    } else {
      process.stdout.write(`    CREATE ${def.name.padEnd(18)} (new)  ... `);
      const created = await el('POST', '/v1/convai/tools', body);
      toolId = created.id ?? created.tool_id;
    }
    clientToolIds.push(toolId);
    console.log(`✅ ${toolId}`);
  }

  // Step 4: Merge tool_ids — keep all existing (including send_money) + add 4 client ids
  const merged = Array.from(new Set([...existingToolIds, ...clientToolIds]));
  console.log(`\n[4] Merged tool_ids (${merged.length}): ${merged.join(', ')}`);

  // Step 5: PATCH agent — prompt + first_message + tool_ids
  console.log('\n[5] Patching agent (prompt + first_message + tool_ids)...');
  await el('PATCH', `/v1/convai/agents/${AGENT_ID}`, {
    conversation_config: {
      agent: {
        prompt: {
          prompt: SYSTEM_PROMPT,
          tool_ids: merged,
        },
        first_message: FIRST_MESSAGE,
      },
    },
  });
  console.log('    ✅ Agent updated');

  // Step 6: Optionally fix send_money → immediate + response schema
  if (fixSendMoney) {
    console.log('\n[6] Upgrading send_money (async → immediate + response schema)...');
    try {
      const smResp = await el('GET', `/v1/convai/tools/${SEND_MONEY_ID}`);
      const existingCfg = smResp.tool_config ?? {};
      await el('PATCH', `/v1/convai/tools/${SEND_MONEY_ID}`, {
        tool_config: {
          ...existingCfg,
          execution_mode: 'immediate',
          response_body_schema: SEND_MONEY_RESPONSE_SCHEMA,
          description: "Executes a financial transaction from the user's Ongea Pesa wallet. Handles internal wallet-to-wallet transfers (c2c/c2b/b2c/b2b) and external M-Pesa payments (till/paybill/phone/withdraw/bank). Returns success/error with agent_message for voice feedback.",
        },
      });
      console.log('    ✅ execution_mode → immediate, response_body_schema added');
      console.log('    ⚠️  CONFIRM with backend: prompt uses 0.5% fee / 20 free sends');
    } catch (err) {
      console.warn(`    ⚠️  send_money PATCH failed (non-fatal): ${err.message}`);
      console.warn('    The 4 client tools + prompt are applied. Fix send_money manually.');
    }
  } else {
    console.log('\n[6] Skipped send_money upgrade (--no-fix-send-money)');
  }

  // Step 7: Verify
  console.log('\n[7] Verifying...');
  const updated = await el('GET', `/v1/convai/agents/${AGENT_ID}`);
  const verifiedIds  = updated.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const verifiedLen  = (updated.conversation_config?.agent?.prompt?.prompt ?? '').length;
  const verifiedMsg  = updated.conversation_config?.agent?.first_message ?? '';
  const hasScanSec   = (updated.conversation_config?.agent?.prompt?.prompt ?? '').includes('Scan-to-Pay');

  console.log(`    tool_ids : ${verifiedIds.length} entries`);
  console.log(`    prompt   : ${verifiedLen} chars`);
  console.log(`    Scan-to-Pay section present: ${hasScanSec}`);
  console.log(`    first_message: "${verifiedMsg.slice(0, 80)}"`);

  console.log(`\n${'='.repeat(54)}`);
  if (verifiedIds.length >= merged.length && hasScanSec) {
    console.log('🎉  Configuration applied successfully!');
  } else {
    console.log('⚠️   Some checks failed — review output above');
    process.exit(1);
  }

  console.log('\n📋  Rollback (restores only send_money tool_id):');
  console.log(`  curl -sX PATCH ${BASE_URL}/v1/convai/agents/${AGENT_ID} \\`);
  console.log(`    -H "xi-api-key: $ELEVENLABS_API_KEY" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"conversation_config":{"agent":{"prompt":{"tool_ids":["${SEND_MONEY_ID}"]}}}}'`);

  console.log('\n✅  Next steps:');
  console.log('  1. npm run dev → open Voice page → start session');
  console.log('  2. Say "scan this till" — camera should open');
  console.log('  3. Say "what is my balance?" — should read from wallet');
  console.log('  4. Ensure OPENAI_API_KEY and GEMINI_API_KEY are in .env.local');
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});

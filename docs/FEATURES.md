# Ongea Pesa — Complete Features Reference

> **Voice-first, AI-powered Kenyan fintech PWA** — pay anything, anywhere, just by speaking.
> Built on Next.js 15 · Supabase · ElevenLabs Conversational AI · n8n · IndexPay · NCBA Open Banking.
>
> *Last updated: 2026-06-07 | Branch: feat/docs-marketing-biometrics*

---

## Architecture at a Glance

The authenticated user experience is a **single-page app shell** (`components/ongea-pesa/app.tsx`)
that state-switches between Dashboard, Voice, Send, Scanner, Saved Bills, Analytics, and Batch
screens — all without page reloads. Chama (group savings), Escrow, Transaction History, Payments,
Scheduler, and Settings live as dedicated App Router routes. Every money-moving server route requires
a **step-up token** (PIN or biometric proof) consumed single-use before money moves.

### Two-balance model
| Ledger | Where | What it tracks |
|---|---|---|
| `profiles.wallet_balance` | Supabase Postgres | Internal wallet — DB trigger debits/credits on `completed` transactions |
| IndexPay gate/pocket | IndexPay cloud | Chama and escrow fund custody |

External sends insert a `processing` transaction (no debit), flip to `completed` (debit) or `failed`
(no debit) via NCBA/Daraja async callbacks — both idempotent by `provider_ref`/`conversation_id`.

### Payment rails (unified via `WalletService.resolveRailAndSend()`)
| Destination | Rail | Cost |
|---|---|---|
| Ongea-to-Ongea phone | Internal RPC `process_internal_transfer` | **Free** |
| M-Pesa phone / paybill / till | NCBA Open Banking → n8n `/webhook/ncba_withdraw` | NCBA fee |
| Utility bills (KPLC/NHIF/NSSF/KRA/etc.) | NCBA bill pay → n8n `/webhook/ncba_bill_pay` | NCBA fee |
| Chama group payouts | Daraja B2C bulk → n8n `/webhook/bulk_disburse` | Daraja B2C fee |

---

## 1. Voice — The Headline Differentiator

The ElevenLabs Conversational AI agent (`agent_5301kbp2gvypf0m83e579ya9nz75`) runs a live voice
session in the browser and can both *listen* to the user and *drive the UI* through client tools.

| Feature | Description | Key Files |
|---|---|---|
| **Live voice session** | Connects via a signed URL (with user context injected: balance, name, gate ID) to a real-time ElevenLabs voice agent. The user speaks; the agent acts. Supports English-first with 200+ Kenyan Swahili money terms. | `app/api/get-signed-url`, `contexts/ElevenLabsContext.tsx` |
| **Animated payment-slot panel** | Replaces raw transcript bubbles. As the agent extracts payment details, three ticked boxes fill in progressively: **Amount · To · Payment Type** — animated, no raw transcription shown. | `components/ongea-pesa/voice-interface.tsx` |
| **Voice-triggered scanner** | Saying "scan" or "open camera" triggers the camera overlay to animate open Drive-style on the current screen without navigating away. | `contexts/ElevenLabsContext.tsx` → `app.tsx` overlay |
| **Voice balance check** | Agent reads wallet balance aloud in KSh with proper Kenyan formatting. | `clientTools.read_balance` |
| **Voice multi-send (send_batch)** | Say "send 500 to Jane, 1000 to Peter, and pay Zuku 2000" — the agent dispatches all payments in one command and reads back per-item results. | `clientTools.send_batch`, `app/api/payments/batch` |
| **Stage-payment slots** | Agent calls `stage_payment` mid-conversation to fill the on-screen Amount/To/Type panel as it extracts each field — before the user confirms. | `clientTools.stage_payment` |
| **Voice step-up confirm** | Money-moving voice intents are staged (`pending_voice_payments`) and only released after an in-app PIN/biometric proof, closing the loop on voice security. | `app/api/voice/confirm/[id]`, `app/api/voice/webhook` |
| **Wake-word activation** | Say **"Hey Ongea"** anywhere in the scanner screen to trigger voice commands (implemented via `use-voice-activation.ts` + Web Speech API). | `hooks/use-voice-activation.ts` |
| **Voice calibration** | First-run flow to calibrate the voice agent with the user's voice characteristics. | `app/(onboarding)/voice-calibration` |
| **Session management** | Comprehensive duplicate-start guard, mic permission request, status events, disconnect trace logging, 10s balance polling during sessions. | `contexts/ElevenLabsContext.tsx` |
| **n8n WALLET SYSTEM** | The voice agent backend: 145-node n8n workflow with 5 AI agent nodes, 31 Supabase nodes, 15 webhooks — processes voice intents, routes payments, writes DB. | `https://primary-production-579c.up.railway.app` |

---

## 2. Scan-to-Pay / OCR

The camera scanner auto-detects payment targets and reads, confirms, and executes the right rail.

| Feature | Description | Key Files |
|---|---|---|
| **Auto-detect scanning** | Captures a video frame every ~1.5s and sends it to `/api/scan/ocr`. At >70% confidence, stops and shows the detected payment target. | `components/ongea-pesa/payment-scanner.tsx` |
| **Dual OCR engine** | OpenAI gpt-4o is the primary OCR model; Gemini 2.5 Flash-Lite is the fallback. Both return a structured `PaymentScanResult`. | `app/api/scan/ocr`, `lib/ocr-shared.ts` |
| **9 payment types detected** | `send_phone` · `buy_goods_pochi` · `buy_goods_till` · `paybill` (+ account) · `withdraw` · `bank_to_mpesa` · `bank_to_bank` · `receipt` · `qr` | `lib/ocr-shared.ts` |
| **Scan-by-type modes** | Six targeted modes: Paybill, Till, QR Code, Receipt, Bank Details, Pochi la Biashara (coming soon). User picks a mode for higher accuracy. | `payment-scanner.tsx` mode selector |
| **Multiple-target disambiguation** | When several payment targets appear on one document, OCR returns `alternatives` and the user picks which to pay. | `components/ongea-pesa/disambiguation-dialog.tsx` |
| **Amount auto-fill + presets** | OCR-detected amount pre-fills the input. Quick preset buttons (100/500/1000/2000/5000/10000) and an insufficient-balance warning. | `payment-scanner.tsx` |
| **Intelligent rail routing** | On confirm, scanned phone numbers are checked via `/api/contacts/resolve-ongea`: Ongea users route as free internal transfers; everyone else routes externally. Till/paybill always external. | `app/api/contacts/resolve-ongea` |
| **Pay Now vs Pay Later/Save** | After scanning a receipt, the user chooses: pay immediately, or save the bill to the Saved Bills screen for later. Either way the scan result and image are persisted. | `app/api/bills/save`, `app/api/receipts/upload` |
| **Receipt image storage** | Captured receipt images are uploaded to the private Supabase Storage `receipts` bucket (5 MB, JPEG/PNG/WebP, owner-scoped signed URLs). | `app/api/receipts/upload`, Supabase Storage |
| **Batch scanning** | Toggle "Batch ON" to queue multiple documents, review a batch summary with total vs balance, then pay all via `/api/payments/batch`. | `payment-scanner.tsx` batch mode |
| **Camera zoom** | Pinch/slider zoom via `track.applyConstraints({advanced:[{zoom}]})` — auto-hides on unsupported devices. | `hooks/use-camera.ts` |
| **Torch / flashlight** | One-tap torch toggle via `applyConstraints({advanced:[{torch}]})` for scanning in low light. | `hooks/use-camera.ts` |
| **Drive-style overlay animation** | When opened by voice, the scanner animates open as a full-page overlay on the current screen (`animate-in fade-in zoom-in-95`). | `components/ongea-pesa/app.tsx` |
| **Voice + audio in scanner** | Spoken confirmations (ElevenLabs TTS or browser fallback), audio on/off toggle, scan-result narration injected into the live voice session. | `app/api/voice/send-scan-data` |

---

## 3. Payments & Sending

| Feature | Description | Key Files |
|---|---|---|
| **Send Money** | Send to a saved contact (fuzzy search), a device contact, or a manual number. Auto-detects Ongea users (free) vs M-Pesa sends (NCBA fee shown). | `components/ongea-pesa/send-money.tsx`, `app/api/wallet/send` |
| **Internal Ongea transfer** | Sending to another Ongea user is an atomic Postgres RPC (`process_internal_transfer`) — instant, free, no external API call. | `lib/services/walletService.ts`, `lib/services/walletService.ts#sendMoney` |
| **Multi-Send / Batch** | Build a list of payments (phone / till / paybill / utility bill: KPLC, NHIF, NSSF, KRA, NWSC, Nairobi Water, GOtv, DStv, Airtel/Safaricom data), send all at once. Continue-on-failure per item (external sends irreversible). | `components/ongea-pesa/batch-send.tsx`, `app/api/payments/batch` |
| **Saved Bills / Pay Later** | Scanned receipts saved to the `saved_bills` table. The Saved Bills screen lists them with receipt thumbnails (signed URLs). Any saved bill can be paid on demand. | `components/ongea-pesa/recurring-payments.tsx`, `app/api/bills` |
| **Scheduled Payments** | View upcoming auto-payments and create new recurring schedules. | `app/scheduler`, `components/ongea-pesa/scheduled-payments.tsx` |
| **Smart Risk Confirmation** | Confirmation modal with dynamic risk level (low/medium/high), warnings, and historical context before any payment executes. | `components/ongea-pesa/smart-confirmation.tsx` |
| **Fee transparency** | 0.5% platform fee + tiered M-Pesa bracket fees shown to the user before confirmation. | `lib/services/walletService.ts#calculateFees` |
| **Payment methods management** | Add, view, and manage payment methods. | `app/payments`, `components/ongea-pesa/payment-methods.tsx` |

---

## 4. Wallet, Balance & Deposit/Withdraw

| Feature | Description | Key Files |
|---|---|---|
| **Balance sheet** | Slide-up panel with real-time wallet balance (Supabase realtime subscription), recent transactions (all/completed/pending/failed filters), and add-funds entry. | `components/ongea-pesa/balance-sheet.tsx` |
| **M-Pesa deposit (STK push)** | Enter amount + phone → IndexPay triggers an M-Pesa STK push → `use-transaction-polling` polls until the wallet is credited. | `components/ongea-pesa/deposit-dialog.tsx`, `app/api/gate/deposit` |
| **Withdrawal** | Cash out from wallet to M-Pesa via NCBA B2C. Minimum KES 50; step-up token required. | `app/api/wallet/withdraw` |
| **M-Pesa number setup** | Auto-prompted on first launch if no M-Pesa number is set. Required before any external payment. | `components/ongea-pesa/mpesa-settings-dialog.tsx` |
| **IndexPay gate/pocket** | Per-user IndexPay gate provisioned at signup. Holds chama/escrow funds separately from the internal wallet. | `lib/services/gateService.ts`, `app/api/gate/*` |
| **Gate balance** | View IndexPay gate and pocket balances (admin view in balance sheet). | `app/api/gate/balance` |
| **Transaction polling** | Exponential-backoff and fixed-interval polling for pending gate/deposit transactions until completion/failure/timeout. | `lib/services/transactionPollingService.ts` |

---

## 5. Groups / Chama (Group Savings)

Chama is a Kenyan rotating savings circle. Ongea Pesa automates the entire lifecycle.

| Feature | Description | Key Files |
|---|---|---|
| **Create Chama** | Create a savings/collection/fundraising group with contribution amount, frequency, collection day, rotation type, and cycle count. Provisions an IndexPay gate+pocket for fund custody. | `app/chama`, `app/api/chama/create` |
| **Bulk member import** | Add members via Android native Contact Picker, iOS/desktop vCard/CSV file upload, or manual entry. | `components/ongea-pesa/contact-import.tsx`, `app/api/chama/add-members-bulk` |
| **Join via invite link** | Members join a chama through a shared invite URL. | `app/chama/join/[id]` |
| **Start collection** | Trigger M-Pesa STK push to all members for the current cycle simultaneously. | `app/api/chama/start-collection` |
| **STK polling & retries** | Poll pending collections, retry individual failed STKs, retry all failed, or resend all. | `app/api/chama/poll-stk`, `app/api/chama/retry-stk`, `app/api/chama/resend-all-stk` |
| **Stop collection** | Halt an active collection cycle. | `app/api/chama/stop-collection` |
| **Rotation shuffle** | Randomize the payout order for fairness. | `app/api/chama/shuffle-rotation` |
| **Distribute / payout** | Disburse collected funds to the rotation member via Daraja B2C bulk; async result reconciled by `conversation_id`. | `app/api/chama/distribute`, `app/api/chama/daraja-callback` |
| **Member exit flow** | Graceful request-and-approve exit process to leave a chama. | `app/chama` (requestExit/approveExit) |
| **Chama types** | Savings, Collection, Fundraising; rotation-based merry-go-round payouts. | `app/chama` |

---

## 6. Escrow

| Feature | Description | Key Files |
|---|---|---|
| **Create Escrow** | Four escrow types: **Two-Party** (buyer/seller), **Multi-Party**, **Milestone** (staged release), **Time-Locked** (date-based). Configures amount, fee %, multi-sig, auto-release. | `app/escrow`, `app/api/escrow/create` |
| **Fund Escrow** | Lock funds into the escrow pocket (IndexPay-backed). | `app/api/escrow/fund` |
| **Release Escrow** | Release funds to beneficiary on agreement or milestone completion. | `app/api/escrow/release` |
| **Dispute** | Raise a dispute with an arbitrator to pause or redirect release. | `app/api/escrow/dispute` |
| **Participation views** | Separate views for escrows you created vs. ones you participate in. | `app/escrow` |

---

## 7. Contacts

| Feature | Description | Key Files |
|---|---|---|
| **Device contact import** | Android Chrome: native multi-select Contact Picker API. iOS/desktop: vCard (.vcf) or CSV file upload. One-time consent. | `components/ongea-pesa/contact-import.tsx`, `app/api/contacts/personal` |
| **Fuzzy contact search** | Real-time fuzzy search across personal + saved contacts; distinguishes Ongea users (free transfer) from phone-only contacts. | `hooks/use-contact-search.ts`, `components/ongea-pesa/contact-picker.tsx` |
| **Ongea-user resolution** | Checks whether a phone/email matches an Ongea Pesa account for free internal routing. | `app/api/contacts/resolve-ongea` |

---

## 8. Analytics & Insights

| Feature | Description | Key Files |
|---|---|---|
| **Spending analytics** | Monthly spending by category (food, transport, utilities, entertainment, shopping), total spent/received, net savings, transaction count. | `components/ongea-pesa/analytics.tsx` |
| **Transaction history** | Full transaction list with status, amount, recipient, and timestamps. | `app/transactions`, `components/ongea-pesa/transaction-history.tsx` |
| **Admin dashboards** | Ten admin views: users, transactions, revenue (0.5% fee tracking), chamas, escrows, M-Pesa history, security events, voice sessions, wallet transfers, settings. | `app/admin-analytics/*` |
| **Revenue analytics** | Server-side fee aggregation + admin summary. | `app/api/admin/revenue/summary` |

---

## 9. Security (Existing)

| Feature | Description | Key Files |
|---|---|---|
| **PIN (bcrypt)** | 4–6 digit PIN, bcrypt cost 12, stored as hash. Set, change (requires current PIN), and verify. | `app/api/security/pin/*`, `lib/services/securityService.ts` |
| **WebAuthn Passkeys (Face/Touch ID)** | Full enroll + step-up ceremonies via `@simplewebauthn`. Device performs the biometric match; only a COSE public key is stored server-side — no face/fingerprint data ever stored. | `app/api/security/passkey/*`, `lib/services/webauthn.ts` |
| **Lockout** | 5 failed PIN/passkey attempts → 15-minute account lock. HTTP 423 on locked accounts. | `lib/services/securityService.ts` |
| **Step-up tokens** | Verifying PIN or passkey issues a single-use, 5-minute `stepup_tokens` row. `/api/wallet/send`, `/api/wallet/withdraw`, `/api/voice/confirm/[id]` consume it before money moves. | `lib/services/securityService.ts#issueStepupToken` |
| **Audit logging** | Typed security events (`security_events`) on every sensitive action (PIN, passkey, lockout, step-up, voice session). Row-change triggers write `audit_log` on `profiles`, `transactions`, `chama_payouts`. | `lib/services/auditService.ts` |
| **Admin security events feed** | Admin-only view of the `security_events` table; guarded by `ADMIN_EMAILS`. | `app/api/admin/security-events` |

---

## 10. Biometric Authentication — Expansion (Phase 5)

*Planned: Face ID (labelled), Fingerprint (labelled), and Voice biometrics (Picovoice Eagle,
server-authoritative scoring, AES-256-GCM encrypted voiceprint at rest). See `docs/BIOMETRICS_SPEC.md`.*

---

## 11. Onboarding & PWA

| Feature | Description | Key Files |
|---|---|---|
| **Welcome flow** | Linear first-run: Welcome → Profile creation → Security setup (PIN + passkey) → Voice calibration → Permissions grant. | `app/(onboarding)/*` |
| **Permission manager** | Request and surface status of mic, camera, contacts, and notification permissions. | `components/ongea-pesa/permission-manager.tsx` |
| **PWA install prompt** | Prompt to install the app to the device home screen. Offline fallback page. | `components/ongea-pesa/pwa-install-prompt.tsx`, `app/offline` |

---

## 12. Integrations Reference

| Integration | Role | Endpoint / Key |
|---|---|---|
| **Supabase** | Auth (sessions), Postgres DB (22 tables, RLS), private `receipts` Storage | Project `efydvozipukolqmynvmv`, eu-north-1 |
| **ElevenLabs** | Conversational AI voice agent (real-time speech ↔ action) | Agent `agent_5301kbp2gvypf0m83e579ya9nz75` |
| **n8n WALLET SYSTEM** | Voice payment backend (145 nodes, 5 AI agents, all webhook rails) | `https://primary-production-579c.up.railway.app` |
| **IndexPay / Gate** | STK push deposits, gate/pocket fund custody for chama & escrow | `lib/services/gateService.ts` |
| **NCBA Open Banking** | External M-Pesa send, paybill, till, utility bill pay; async callbacks | n8n webhooks + `/api/ncba/callback` |
| **M-Pesa Daraja** | B2C bulk payout for chama distributions | n8n + `/api/chama/daraja-callback` |
| **OpenAI gpt-4o** | Primary OCR for receipt/till/paybill scan | `/api/scan/ocr` |
| **Gemini 2.5 Flash-Lite** | OCR fallback when OpenAI call fails | `/api/scan/ocr` |
| **Picovoice Eagle** | Voice-biometric speaker verification (server-authoritative, Phase 5) | `@picovoice/eagle-node` |

---

## Database Tables (22 live, all RLS-enabled)

| Table | Category | Key Purpose |
|---|---|---|
| `profiles` | Core | User wallet balance, PIN hash, biometric flag, gate IDs, KYC |
| `transactions` | Core | All money movements; DB trigger debit/credit on `completed` |
| `voice_sessions` | Voice | ElevenLabs session tracking, 15-min expiry |
| `pending_voice_payments` | Security | Voice intents staged for step-up confirm |
| `webauthn_credentials` | Security | Passkey public keys (COSE) + device labels |
| `webauthn_challenges` | Security | Short-lived register/auth/voice challenges |
| `auth_attempts` | Security | Per-attempt audit (pin/passkey/login/stepup) |
| `stepup_tokens` | Security | Single-use 5-min step-up proof tokens |
| `security_events` | Security | Typed audit trail (ip/ua/severity/metadata) |
| `audit_log` | Security | Row-change log populated by Postgres triggers |
| `personal_contacts` | Contacts | Device/vCard/CSV imported contacts |
| `saved_bills` | Payments | Pay-later scanned bills (pending/paid/cancelled) |
| `payment_methods` | Payments | User payment method records |
| `subscriptions` / `subscription_plans` | Billing | Subscription management |
| `balance_history` | Wallet | Balance snapshots over time |
| `mpesa_transactions` | Wallet | IndexPay/M-Pesa deposit records |
| `gate_transactions` | Wallet | IndexPay gate/pocket transaction log |
| `chamas` / `chama_members` / `chama_projects` / `chama_cycles` / `chama_stk_requests` / `chama_payouts` | Chama | Full group savings lifecycle |
| `escrows` / `escrow_participants` / `escrow_milestones` / `escrow_transactions` / `escrow_disputes` | Escrow | Full escrow lifecycle |
| `voice_biometric_profiles` *(Phase 5)* | Security | AES-256-GCM encrypted voiceprints |

---

*Generated from full codebase exploration. All feature claims backed by existing code.*

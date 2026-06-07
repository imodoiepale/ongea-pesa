<!-- converted from FEATURES.docx -->


Ongea Pesa
Complete Features Reference

Ongea Pesa · Voice-First Kenyan Fintech · 2026

# Overview
Ongea Pesa is a voice-first, AI-powered Kenyan fintech Progressive Web App that lets users pay anything, anywhere, simply by speaking. Built on Next.js 15, Supabase, ElevenLabs Conversational AI, n8n automation, IndexPay wallet infrastructure, and NCBA Open Banking.

## Architecture
The app runs as a single-page shell (app.tsx) that state-switches between Voice, Send, Scanner, Saved Bills, Analytics, and Batch screens. Chama, Escrow, Transactions, and Settings live as standalone App Router routes.
### Payment Rails

## Voice Features
ElevenLabs Conversational AI agent — real-time English/Swahili voice session driving the full payment experience.
- Live voice session with mic permission, signed URL, balance injection, status management
- Animated payment-slot panel (Amount · To · Payment Type) replacing raw transcript
- Voice-triggered scanner overlay — opens camera over any screen without navigating
- Voice balance check — reads KSh balance aloud
- Voice multi-send (send_batch) — pay multiple recipients in one spoken command
- Stage-payment slots — fills the on-screen panel mid-conversation
- Voice step-up confirm — staged payments released only after PIN/biometric proof
- Wake-word "Hey Ongea" activation in the scanner

## Scan-to-Pay / OCR
- Auto-detect scanning — captures frames every 1.5s, auto-stops at >70% confidence
- Dual OCR: OpenAI gpt-4o primary, Gemini 2.5 Flash-Lite fallback
- 9 payment types: phone, till, paybill, receipt, QR, bank transfer, withdraw, pochi
- Pay Now / Pay Later — receipts saved to saved_bills table and private Storage bucket
- Batch scanning — queue multiple, pay all at once
- Camera zoom + torch via hardware constraints
- Drive-style full-page overlay animation (animate-in fade-in zoom-in-95)

## Payments & Sending
- Send Money — auto-detects Ongea user (free) vs M-Pesa (NCBA fee shown)
- Multi-Send / Batch — pay a list of people/utilities at once
- Saved Bills — pay-later bills with receipt thumbnails and Pay buttons
- Scheduled Payments — recurring auto-payment schedules
- Smart Risk Confirmation — low/medium/high risk level with warnings
- Fee transparency — platform + M-Pesa fees shown before confirmation

## Wallet, Balance & Deposit
- Balance sheet — real-time Supabase subscription, filterable transaction history
- M-Pesa STK push deposit — enter amount, approve on phone, wallet credited
- Withdrawal — cash out to M-Pesa via NCBA B2C (step-up required)
- Two-balance model: internal Postgres ledger + IndexPay gate/pocket

## Groups / Chama
- Create chama — savings, collection, or fundraising group
- Bulk member import — Contact Picker API, vCard, or CSV
- Start collection — STK push to all members simultaneously
- STK retry, resend, and stop collection
- Rotation shuffle and automatic Daraja B2C payout

## Escrow
- Four types: Two-Party, Multi-Party, Milestone, Time-Locked
- Fund, Release, and Dispute flows with IndexPay pocket custody

## Contacts
- Device Contact Picker + vCard/CSV import
- Fuzzy search — real contacts + saved contacts
- Ongea-user detection for free internal routing

## Security (Existing)
- PIN (bcrypt cost 12, 4–6 digits, set/change/verify)
- WebAuthn Passkeys — device biometric, COSE public key only stored server-side
- Lockout — 5 fails → 15-min lock, HTTP 423
- Step-up tokens — single-use, 5-min TTL, consumed before every money move
- Audit log — typed security events + Postgres row-change triggers

## Biometric Authentication — Expansion (Phase 5)
Face ID (labelled), Fingerprint (labelled), and Voice biometrics (Picovoice Eagle, server-authoritative scoring, AES-256-GCM encrypted voiceprint at rest). See database/migrations/019_voice_biometrics_and_modality.sql.

## Integrations
| Destination | Rail | Cost |
| --- | --- | --- |
| Ongea-to-Ongea phone | Internal RPC (process_internal_transfer) | FREE |
| M-Pesa phone / paybill / till | NCBA Open Banking → n8n | NCBA fee |
| Utility bills (KPLC/NHIF/etc.) | NCBA bill pay → n8n | NCBA fee |
| Chama payouts | Daraja B2C bulk → n8n | Daraja fee |
| Integration | Role |
| --- | --- |
| Supabase | Auth, Postgres DB (22 tables, RLS), Storage |
| ElevenLabs | Real-time conversational AI voice agent |
| n8n WALLET SYSTEM | 145-node workflow, all payment rails |
| IndexPay / Gate | STK deposit, chama/escrow custody |
| NCBA Open Banking | M-Pesa send, paybill, till, utility bills |
| M-Pesa Daraja | B2C bulk payout for chama distributions |
| OpenAI gpt-4o | Primary OCR for scan-to-pay |
| Gemini 2.5 Flash-Lite | OCR fallback |
| Picovoice Eagle (Phase 5) | Voice biometric speaker verification |
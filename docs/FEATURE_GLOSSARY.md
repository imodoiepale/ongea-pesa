# Ongea Pesa — Feature Glossary

> Each entry is a **10–20 word plain-language explanation** of one feature — what it is in a breath.
> Ordered by user journey, from voice through to security.

---

## Voice

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Voice Session** | Talk to an AI agent that understands English and Swahili and acts on your behalf. |
| **Payment Slot Panel** | Watch three boxes fill in live — Amount, Who, Payment Type — as you speak. |
| **Voice Balance Check** | Ask your balance and hear it read back instantly in Kenyan shillings. |
| **Voice Multi-Send** | Say names and amounts in one sentence; the agent pays everyone at once. |
| **Voice Scanner Trigger** | Say "scan" and the camera opens instantly without you touching the screen. |
| **Stage Payment** | The agent assembles your payment details on-screen while you're still talking. |
| **Voice Step-Up Confirm** | Voice payments require a PIN or biometric proof before money actually moves. |
| **Wake-Word Activation** | Say "Hey Ongea" anywhere in the scanner to start speaking commands hands-free. |
| **Voice Calibration** | A short first-time setup that tunes the agent to understand your voice better. |
| **n8n AI Backbone** | A 145-node automation workflow processes voice commands and routes real payments. |

---

## Scan-to-Pay / OCR

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Auto-Detect Scan** | Point your camera at anything — the app reads and identifies the payment automatically. |
| **Dual OCR Engine** | OpenAI reads the image first; Gemini steps in instantly if anything goes wrong. |
| **9 Payment Types** | Detects tills, paybills, phone numbers, receipts, bank details, QR codes, and more. |
| **Scan-by-Type Mode** | Choose a specific scan mode — Till, Paybill, QR, Receipt — for faster, more accurate reads. |
| **Disambiguation** | When multiple payment targets appear, you pick the one you want to pay. |
| **Amount Presets** | Quick-tap preset amounts (100 to 10,000) so you never need to type. |
| **Smart Rail Routing** | Paying another Ongea user is free and instant; everyone else routes via NCBA. |
| **Pay Now / Pay Later** | After scanning a receipt, choose to pay immediately or save it for later. |
| **Receipt Image Storage** | Your scanned receipt photo is saved privately; view it anytime via a secure link. |
| **Batch Scanning** | Scan multiple documents, queue them all, review the total, then pay everything at once. |
| **Camera Zoom** | Slide to zoom in optically on small text — works on any phone with zoom support. |
| **Torch / Flashlight** | One tap lights up the scene so you can scan in dark environments. |
| **Drive-Style Camera Open** | The camera glides open full-screen like Google Drive — no jarring page changes. |

---

## Payments & Sending

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Send Money** | Send to a contact or number; the app detects whether it's free or has a fee. |
| **Free Internal Transfer** | Sending between Ongea users is instant, free, and never touches M-Pesa. |
| **Multi-Send / Batch Pay** | Pay rent, utilities, and family in one action — build a list and send all at once. |
| **Saved Bills** | Scanned receipts you chose to pay later live here, with thumbnails and a Pay button. |
| **Scheduled Payments** | Set a payment to repeat automatically — weekly, monthly, or whenever you choose. |
| **Smart Risk Confirmation** | A safety check shows low / medium / high risk before you confirm any payment. |
| **Fee Transparency** | Your exact platform fee and M-Pesa fees are shown before you tap confirm. |

---

## Wallet & Balance

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Balance Sheet** | Swipe up for your live wallet balance and a filterable transaction timeline. |
| **M-Pesa Deposit** | Enter an amount; a push notification asks your phone to confirm — wallet topped instantly. |
| **Withdrawal** | Move funds from your Ongea wallet back to M-Pesa in seconds. |
| **M-Pesa Number Setup** | One-time prompt to link your M-Pesa number so external payments work. |
| **IndexPay Gate** | A secure pocket attached to your account that holds chama and escrow money. |

---

## Groups / Chama

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Create Chama** | Start a group savings circle — set the amount, schedule, and who gets paid when. |
| **Bulk Member Import** | Add all your group members at once from your contacts, a spreadsheet, or vCard file. |
| **Chama Invite Link** | Share one link and new members join your chama without any admin friction. |
| **Start Collection** | One tap sends an M-Pesa payment request to every member at the same moment. |
| **STK Retry** | If someone missed the first request, resend theirs without touching the others. |
| **Rotation Shuffle** | Randomize the payout order with one tap for a fair and transparent rotation. |
| **Distribute Payout** | Collected funds hit the rotation member's M-Pesa automatically via Daraja. |

---

## Escrow

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Two-Party Escrow** | Buyer sends funds; they're locked until the seller delivers — then released. |
| **Milestone Escrow** | Funds release in stages as each agreed deliverable is confirmed complete. |
| **Time-Locked Escrow** | Money is locked until a specific date, then automatically released to the beneficiary. |
| **Multi-Party Escrow** | Multiple contributors pool funds held safely until agreed conditions are met. |
| **Dispute** | Either party can flag a problem; an arbitrator steps in to resolve the release. |

---

## Contacts

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Device Contact Import** | Tap to import your phone contacts; CSV and vCard uploads work too. |
| **Fuzzy Contact Search** | Type a name loosely — the search finds the right person even with a typo. |
| **Ongea User Detection** | Sending to an Ongea number automatically upgrades to a free internal transfer. |

---

## Analytics

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Spending Categories** | See exactly how much you spent on food, transport, utilities, and more this month. |
| **Transaction History** | Every payment in or out, filterable by status — completed, pending, or failed. |
| **Admin Dashboards** | Ten live dashboards give operators a full view of users, revenue, and security. |

---

## Security

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **PIN** | A 4–6 digit code secures your account; stored as a one-way cryptographic hash. |
| **Passkey / Face & Touch ID** | Your face or fingerprint unlocks payments — the raw biometric never leaves your device. |
| **Account Lockout** | Five wrong attempts locks your account for 15 minutes to stop brute-force attacks. |
| **Step-Up Token** | One-time proof of identity required every time money moves — expires in five minutes. |
| **Audit Log** | Every sensitive action is recorded automatically — who did what, when, and from where. |
| **Voice Biometrics** *(Phase 5)* | Your voice becomes a key — a speaker-recognition model verifies it's really you. |

---

## Onboarding & PWA

| Feature | Plain-language meaning (10–20 words) |
|---|---|
| **Welcome Flow** | A five-step guided setup from sign-up to your first voice-ready wallet in under two minutes. |
| **Permission Manager** | Grant mic, camera, contacts, and notification access — all in one transparent screen. |
| **PWA / Install to Home Screen** | Install Ongea Pesa like a native app — works offline, no app store needed. |

---

*37 features documented. Every entry: ≤20 words, plain language, no jargon.*

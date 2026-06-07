/**
 * Ongea Pesa — Markdown → DOCX Generator
 *
 * Converts the documentation MD files to branded .docx files.
 * Run: node scripts/generate-docs-docx.mjs
 *
 * Brand: Emerald #0A4D3A · Gold #C9A84C · Charcoal #1A1A1A · Cream #F5F0E8
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, convertInchesToTwip, PageBreak,
  Header, Footer, ImageRun,
} from 'docx'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Brand Colours ────────────────────────────────────────────────────────────
const EMERALD  = '0A4D3A'
const GOLD     = 'C9A84C'
const CHARCOAL = '1A1A1A'
const CREAM    = 'F5F0E8'
const WHITE    = 'FFFFFF'
const LIGHT_EMERALD = 'E8F5F0'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function heading(text, level = HeadingLevel.HEADING_1) {
  const sizes = {
    [HeadingLevel.HEADING_1]: { size: 36, color: EMERALD, bold: true },
    [HeadingLevel.HEADING_2]: { size: 28, color: EMERALD, bold: true },
    [HeadingLevel.HEADING_3]: { size: 24, color: CHARCOAL, bold: true },
    [HeadingLevel.HEADING_4]: { size: 22, color: CHARCOAL, bold: false },
  }
  const s = sizes[level] || sizes[HeadingLevel.HEADING_1]
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, color: s.color, size: s.size, bold: s.bold, font: 'Calibri' })],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({
      text,
      size: opts.size || 22,
      color: opts.color || CHARCOAL,
      bold: opts.bold || false,
      italics: opts.italic || false,
      font: 'Calibri',
    })],
  })
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, color: CHARCOAL, font: 'Calibri' })],
  })
}

function rule() {
  return new Paragraph({
    border: { bottom: { color: GOLD, space: 1, value: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 120, after: 120 },
    children: [],
  })
}

function titlePage(title, subtitle) {
  return [
    new Paragraph({ spacing: { before: 1440 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title, size: 56, bold: true, color: EMERALD, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: subtitle, size: 28, color: GOLD, font: 'Calibri', italics: true })],
    }),
    rule(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Ongea Pesa · Voice-First Kenyan Fintech · 2026', size: 20, color: CHARCOAL, font: 'Calibri' })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

function tableHeader(...cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(text => new TableCell({
      shading: { fill: EMERALD, type: ShadingType.SOLID },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: 'Calibri' })],
      })],
    })),
  })
}

function tableRow(shade, ...cells) {
  return new TableRow({
    children: cells.map(text => new TableCell({
      shading: shade ? { fill: LIGHT_EMERALD, type: ShadingType.SOLID } : undefined,
      children: [new Paragraph({
        children: [new TextRun({ text, size: 18, color: CHARCOAL, font: 'Calibri' })],
      })],
    })),
  })
}

// ─── Parse markdown table rows (simple splitter) ──────────────────────────────
function parseMdTable(block) {
  const lines = block.trim().split('\n').filter(l => l.includes('|') && !l.match(/^[\s|:-]+$/))
  return lines.map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
}

// ─── Document builders ────────────────────────────────────────────────────────

function buildFeaturesDoc() {
  const md = readFileSync(join(ROOT, 'docs/FEATURES.md'), 'utf8')
  const children = [
    ...titlePage('Ongea Pesa', 'Complete Features Reference'),
    heading('Overview', HeadingLevel.HEADING_1),
    para('Ongea Pesa is a voice-first, AI-powered Kenyan fintech Progressive Web App that lets users pay anything, anywhere, simply by speaking. Built on Next.js 15, Supabase, ElevenLabs Conversational AI, n8n automation, IndexPay wallet infrastructure, and NCBA Open Banking.'),
    rule(),

    // Architecture
    heading('Architecture', HeadingLevel.HEADING_2),
    para('The app runs as a single-page shell (app.tsx) that state-switches between Voice, Send, Scanner, Saved Bills, Analytics, and Batch screens. Chama, Escrow, Transactions, and Settings live as standalone App Router routes.'),
    heading('Payment Rails', HeadingLevel.HEADING_3),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Destination', 'Rail', 'Cost'),
        tableRow(false, 'Ongea-to-Ongea phone', 'Internal RPC (process_internal_transfer)', 'FREE'),
        tableRow(true,  'M-Pesa phone / paybill / till', 'NCBA Open Banking → n8n', 'NCBA fee'),
        tableRow(false, 'Utility bills (KPLC/NHIF/etc.)', 'NCBA bill pay → n8n', 'NCBA fee'),
        tableRow(true,  'Chama payouts', 'Daraja B2C bulk → n8n', 'Daraja fee'),
      ],
    }),
    rule(),

    // Feature sections extracted from MD categories
    heading('Voice Features', HeadingLevel.HEADING_2),
    para('ElevenLabs Conversational AI agent — real-time English/Swahili voice session driving the full payment experience.'),
    bullet('Live voice session with mic permission, signed URL, balance injection, status management'),
    bullet('Animated payment-slot panel (Amount · To · Payment Type) replacing raw transcript'),
    bullet('Voice-triggered scanner overlay — opens camera over any screen without navigating'),
    bullet('Voice balance check — reads KSh balance aloud'),
    bullet('Voice multi-send (send_batch) — pay multiple recipients in one spoken command'),
    bullet('Stage-payment slots — fills the on-screen panel mid-conversation'),
    bullet('Voice step-up confirm — staged payments released only after PIN/biometric proof'),
    bullet('Wake-word "Hey Ongea" activation in the scanner'),
    rule(),

    heading('Scan-to-Pay / OCR', HeadingLevel.HEADING_2),
    bullet('Auto-detect scanning — captures frames every 1.5s, auto-stops at >70% confidence'),
    bullet('Dual OCR: OpenAI gpt-4o primary, Gemini 2.5 Flash-Lite fallback'),
    bullet('9 payment types: phone, till, paybill, receipt, QR, bank transfer, withdraw, pochi'),
    bullet('Pay Now / Pay Later — receipts saved to saved_bills table and private Storage bucket'),
    bullet('Batch scanning — queue multiple, pay all at once'),
    bullet('Camera zoom + torch via hardware constraints'),
    bullet('Drive-style full-page overlay animation (animate-in fade-in zoom-in-95)'),
    rule(),

    heading('Payments & Sending', HeadingLevel.HEADING_2),
    bullet('Send Money — auto-detects Ongea user (free) vs M-Pesa (NCBA fee shown)'),
    bullet('Multi-Send / Batch — pay a list of people/utilities at once'),
    bullet('Saved Bills — pay-later bills with receipt thumbnails and Pay buttons'),
    bullet('Scheduled Payments — recurring auto-payment schedules'),
    bullet('Smart Risk Confirmation — low/medium/high risk level with warnings'),
    bullet('Fee transparency — platform + M-Pesa fees shown before confirmation'),
    rule(),

    heading('Wallet, Balance & Deposit', HeadingLevel.HEADING_2),
    bullet('Balance sheet — real-time Supabase subscription, filterable transaction history'),
    bullet('M-Pesa STK push deposit — enter amount, approve on phone, wallet credited'),
    bullet('Withdrawal — cash out to M-Pesa via NCBA B2C (step-up required)'),
    bullet('Two-balance model: internal Postgres ledger + IndexPay gate/pocket'),
    rule(),

    heading('Groups / Chama', HeadingLevel.HEADING_2),
    bullet('Create chama — savings, collection, or fundraising group'),
    bullet('Bulk member import — Contact Picker API, vCard, or CSV'),
    bullet('Start collection — STK push to all members simultaneously'),
    bullet('STK retry, resend, and stop collection'),
    bullet('Rotation shuffle and automatic Daraja B2C payout'),
    rule(),

    heading('Escrow', HeadingLevel.HEADING_2),
    bullet('Four types: Two-Party, Multi-Party, Milestone, Time-Locked'),
    bullet('Fund, Release, and Dispute flows with IndexPay pocket custody'),
    rule(),

    heading('Contacts', HeadingLevel.HEADING_2),
    bullet('Device Contact Picker + vCard/CSV import'),
    bullet('Fuzzy search — real contacts + saved contacts'),
    bullet('Ongea-user detection for free internal routing'),
    rule(),

    heading('Security (Existing)', HeadingLevel.HEADING_2),
    bullet('PIN (bcrypt cost 12, 4–6 digits, set/change/verify)'),
    bullet('WebAuthn Passkeys — device biometric, COSE public key only stored server-side'),
    bullet('Lockout — 5 fails → 15-min lock, HTTP 423'),
    bullet('Step-up tokens — single-use, 5-min TTL, consumed before every money move'),
    bullet('Audit log — typed security events + Postgres row-change triggers'),
    rule(),

    heading('Biometric Authentication — Expansion (Phase 5)', HeadingLevel.HEADING_2),
    para('Face ID (labelled), Fingerprint (labelled), and Voice biometrics (Picovoice Eagle, server-authoritative scoring, AES-256-GCM encrypted voiceprint at rest). See database/migrations/019_voice_biometrics_and_modality.sql.', { italic: true }),
    rule(),

    heading('Integrations', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Integration', 'Role'),
        tableRow(false, 'Supabase', 'Auth, Postgres DB (22 tables, RLS), Storage'),
        tableRow(true,  'ElevenLabs', 'Real-time conversational AI voice agent'),
        tableRow(false, 'n8n WALLET SYSTEM', '145-node workflow, all payment rails'),
        tableRow(true,  'IndexPay / Gate', 'STK deposit, chama/escrow custody'),
        tableRow(false, 'NCBA Open Banking', 'M-Pesa send, paybill, till, utility bills'),
        tableRow(true,  'M-Pesa Daraja', 'B2C bulk payout for chama distributions'),
        tableRow(false, 'OpenAI gpt-4o', 'Primary OCR for scan-to-pay'),
        tableRow(true,  'Gemini 2.5 Flash-Lite', 'OCR fallback'),
        tableRow(false, 'Picovoice Eagle (Phase 5)', 'Voice biometric speaker verification'),
      ],
    }),
  ]

  return new Document({ sections: [{ children }] })
}

function buildGlossaryDoc() {
  const children = [
    ...titlePage('Ongea Pesa', 'Feature Glossary — Plain Language'),
    heading('What Every Feature Does in 10–20 Words', HeadingLevel.HEADING_2),
    para('Each entry explains one feature in plain language — what it is, in a single breath.'),
    rule(),

    heading('Voice', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Feature', 'Plain-Language Meaning'),
        tableRow(false, 'Voice Session',         'Talk to an AI agent that understands English and Swahili and acts on your behalf.'),
        tableRow(true,  'Payment Slot Panel',    'Watch three boxes fill in live — Amount, Who, Payment Type — as you speak.'),
        tableRow(false, 'Voice Balance Check',   'Ask your balance and hear it read back instantly in Kenyan shillings.'),
        tableRow(true,  'Voice Multi-Send',      'Say names and amounts in one sentence; the agent pays everyone at once.'),
        tableRow(false, 'Voice Scanner Trigger', 'Say "scan" and the camera opens instantly without you touching the screen.'),
        tableRow(true,  'Stage Payment',         'The agent assembles your payment details on-screen while you\'re still talking.'),
        tableRow(false, 'Voice Step-Up Confirm', 'Voice payments require a PIN or biometric proof before money actually moves.'),
        tableRow(true,  'Wake-Word Activation',  'Say "Hey Ongea" anywhere in the scanner to start speaking commands hands-free.'),
        tableRow(false, 'Voice Calibration',     'A short first-time setup that tunes the agent to understand your voice better.'),
        tableRow(true,  'n8n AI Backbone',       'A 145-node automation workflow processes voice commands and routes real payments.'),
      ],
    }),
    rule(),

    heading('Scan-to-Pay / OCR', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Feature', 'Plain-Language Meaning'),
        tableRow(false, 'Auto-Detect Scan',         'Point your camera at anything — the app reads and identifies the payment automatically.'),
        tableRow(true,  'Dual OCR Engine',           'OpenAI reads the image first; Gemini steps in instantly if anything goes wrong.'),
        tableRow(false, '9 Payment Types',           'Detects tills, paybills, phone numbers, receipts, bank details, QR codes, and more.'),
        tableRow(true,  'Scan-by-Type Mode',         'Choose a specific scan mode — Till, Paybill, QR, Receipt — for faster, more accurate reads.'),
        tableRow(false, 'Amount Presets',            'Quick-tap preset amounts (100 to 10,000) so you never need to type.'),
        tableRow(true,  'Smart Rail Routing',        'Paying another Ongea user is free and instant; everyone else routes via NCBA.'),
        tableRow(false, 'Pay Now / Pay Later',       'After scanning a receipt, choose to pay immediately or save it for later.'),
        tableRow(true,  'Receipt Image Storage',     'Your scanned receipt photo is saved privately; view it anytime via a secure link.'),
        tableRow(false, 'Batch Scanning',            'Scan multiple documents, queue them all, review the total, then pay everything at once.'),
        tableRow(true,  'Camera Zoom',               'Slide to zoom in optically on small text — works on any phone with zoom support.'),
        tableRow(false, 'Torch / Flashlight',        'One tap lights up the scene so you can scan in dark environments.'),
        tableRow(true,  'Drive-Style Camera Open',   'The camera glides open full-screen like Google Drive — no jarring page changes.'),
      ],
    }),
    rule(),

    heading('Payments & Sending', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Feature', 'Plain-Language Meaning'),
        tableRow(false, 'Send Money',             'Send to a contact or number; the app detects whether it\'s free or has a fee.'),
        tableRow(true,  'Free Internal Transfer', 'Sending between Ongea users is instant, free, and never touches M-Pesa.'),
        tableRow(false, 'Multi-Send / Batch Pay', 'Pay rent, utilities, and family in one action — build a list and send all at once.'),
        tableRow(true,  'Saved Bills',            'Scanned receipts you chose to pay later live here, with thumbnails and a Pay button.'),
        tableRow(false, 'Scheduled Payments',     'Set a payment to repeat automatically — weekly, monthly, or whenever you choose.'),
        tableRow(true,  'Smart Risk Confirm',     'A safety check shows low / medium / high risk before you confirm any payment.'),
        tableRow(false, 'Fee Transparency',       'Your exact platform fee and M-Pesa fees are shown before you tap confirm.'),
      ],
    }),
    rule(),

    heading('Groups / Chama', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Feature', 'Plain-Language Meaning'),
        tableRow(false, 'Create Chama',      'Start a group savings circle — set the amount, schedule, and who gets paid when.'),
        tableRow(true,  'Bulk Member Import','Add all your group members at once from your contacts, a spreadsheet, or vCard file.'),
        tableRow(false, 'Chama Invite Link', 'Share one link and new members join your chama without any admin friction.'),
        tableRow(true,  'Start Collection',  'One tap sends an M-Pesa payment request to every member at the same moment.'),
        tableRow(false, 'STK Retry',         'If someone missed the first request, resend theirs without touching the others.'),
        tableRow(true,  'Rotation Shuffle',  'Randomize the payout order with one tap for a fair and transparent rotation.'),
        tableRow(false, 'Distribute Payout', 'Collected funds hit the rotation member\'s M-Pesa automatically via Daraja.'),
      ],
    }),
    rule(),

    heading('Security', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader('Feature', 'Plain-Language Meaning'),
        tableRow(false, 'PIN',                    'A 4–6 digit code secures your account; stored as a one-way cryptographic hash.'),
        tableRow(true,  'Passkey / Face & Touch ID','Your face or fingerprint unlocks payments — the raw biometric never leaves your device.'),
        tableRow(false, 'Account Lockout',         'Five wrong attempts locks your account for 15 minutes to stop brute-force attacks.'),
        tableRow(true,  'Step-Up Token',           'One-time proof of identity required every time money moves — expires in five minutes.'),
        tableRow(false, 'Audit Log',               'Every sensitive action is recorded automatically — who did what, when, and from where.'),
        tableRow(true,  'Voice Biometrics (Phase 5)','Your voice becomes a key — a speaker-recognition model verifies it\'s really you.'),
      ],
    }),
  ]

  return new Document({ sections: [{ children }] })
}

function buildMarketingDoc() {
  const promptsMd = readFileSync(join(ROOT, 'docs/marketing/IMAGE_PROMPTS.md'), 'utf8')
  const scriptsMd = readFileSync(join(ROOT, 'docs/marketing/VIDEO_SCRIPTS.md'), 'utf8')

  const children = [
    ...titlePage('Ongea Pesa', 'Marketing Pack — Image Prompts & Video Scripts'),

    // IMAGE PROMPTS
    heading('PART A — Premium 4K Image-Generation Prompts', HeadingLevel.HEADING_1),
    para('Brand palette: Deep Emerald #0A4D3A · Gold #C9A84C · Charcoal #1A1A1A · Cream #F5F0E8', { italic: true }),
    rule(),

    heading('Lifestyle / Marketing Images', HeadingLevel.HEADING_2),
    para('Five premium aspirational lifestyle scenes — real Kenyan context, cinematic 4K, shallow DOF.'),
    ...[
      ['L-1 · PARKING PAY', '"Your voice just paid for parking"',
       'A confident Kenyan professional woman in a tailored emerald blazer sits in a sleek black SUV in the Nairobi CBD at golden hour. She holds her phone showing the Ongea Pesa payment confirmation screen. The parking meter reads "PAID." Cinematic, f/1.8, warm gold highlights.'],
      ['L-2 · SUPERMARKET CHECKOUT', '"Tap? No. Speak."',
       'A stylish Kenyan man at a high-end supermarket checkout in a Nairobi mall. He holds his phone over the till receipt; the Ongea Pesa scanner frame (emerald green) locks onto the paybill. The checkout assistant smiles in warm bokeh background. 9:16 social format.'],
      ['L-3 · SENDING TO FAMILY', '"One word. She received it."',
       'Split-scene: LEFT = young Nairobi professional speaking into his phone (emerald waveform on screen). RIGHT = his mother in rural Kenya seeing the M-Pesa received notification — pure joy on her face. Golden bridge of light connecting the two halves.'],
      ['L-4 · BODA PAYMENT', '"No change needed. Ever."',
       'A young Kenyan woman in ankara-print steps off a matatu and holds her phone to a fare board. Ongea Pesa reads the amount and the rider\'s phone beeps. Nairobi street energy, golden afternoon light, motion blur on passing traffic.'],
      ['L-5 · RESTAURANT SCAN', '"Scan the bill. Done in one breath."',
       'Upscale rooftop restaurant at blue hour, Nairobi skyline bokeh. A polished woman in a black dress holds her phone camera over the paper bill without looking at it. The emerald scanner frame locks on. She\'s still mid-conversation. Candlelit, romantic, premium.'],
    ].flatMap(([title, tagline, desc]) => [
      heading(title, HeadingLevel.HEADING_3),
      para(tagline, { bold: true, color: GOLD }),
      para(desc),
      rule(),
    ]),

    heading('Technical / Explainer Images', HeadingLevel.HEADING_2),
    para('Five Huawei/Alibaba-style clean product-technical visuals — GitHub-hostable, pitch-deck ready.'),
    ...[
      ['T-1 · VOICE-TO-PAYMENT PIPELINE', 'How It Works',
       'Isometric 3D pipeline on deep charcoal: SPEAK → ElevenLabs AI → n8n 145 nodes → Supabase DB → NCBA Rail → PAID ✓. Premium 3D icons, emerald + gold connectors, white labels.'],
      ['T-2 · SCAN-TO-PAY PIPELINE', 'Camera to Confirmed',
       'Vertical pipeline on emerald gradient: CAPTURE FRAME → Dual OCR (gpt-4o / Gemini) → PAYMENT OBJECT → routing diamond (Internal / NCBA) → wallet credited. Apple-meets-Alibaba style.'],
      ['T-3 · SECURITY ARCHITECTURE', 'Three Locks. Zero Compromise.',
       'Dark charcoal, gold shield center. Three orbiting pillars: Face/Fingerprint (WebAuthn), Voice (Picovoice Eagle), PIN+Step-up. Base: Supabase RLS on all 22 tables. Gold arcs, premium depth.'],
      ['T-4 · CHAMA LIFECYCLE', 'Collect. Rotate. Grow.',
       'Circular flow on cream/gold background: Create → Add Members → STK Collection → Poll+Retry → Rotation Shuffle → Daraja Payout → repeat. Emerald + gold 3D icons, crisp labels.'],
      ['T-5 · TWO-BALANCE ARCHITECTURE', 'One App. Two Ledgers. Total Clarity.',
       'Two floating cards on charcoal: LEFT = Internal Wallet (Postgres trigger diagram), RIGHT = IndexPay Gate/Pocket (chama/escrow icons). Center: resolveRailAndSend() routing diamond with 4 rails.'],
    ].flatMap(([title, tagline, desc]) => [
      heading(title, HeadingLevel.HEADING_3),
      para(tagline, { bold: true, color: GOLD }),
      para(desc),
      rule(),
    ]),

    new Paragraph({ children: [new PageBreak()] }),

    // VIDEO SCRIPTS
    heading('PART B — 10 Viral Video Scripts', HeadingLevel.HEADING_1),
    para('Format: Vertical 9:16 · 15–30 seconds · Hook-first · Premium, aspirational, convenience-led', { italic: true }),
    para('For: Higgsfield storyboarding → TikTok / Instagram Reels / YouTube Shorts', { italic: true }),
    rule(),

    ...[
      ['Script 1', 'THE VOICE PAY HERO', '"She paid without looking at her phone"', 28,
       'Elegant rooftop restaurant, Nairobi night skyline. She speaks "Lipa bili." Slot panel fills: KSh 3,200 · Mulla\'s Kitchen. Agent confirms. She sets the phone down and raises her wine glass.',
       'Elegant, slow', 'Ambient jazz, soft piano'],
      ['Script 2', 'THE SUPERMARKET MOMENT', '"No cash. No card. No problem."', 25,
       'High-end Nairobi supermarket. He points camera at till receipt. Scanner locks on. Green checkmark. Cashier screen: PAID. He walks off without breaking stride.',
       'Upbeat, crisp', 'Upbeat lo-fi, satisfying clicks'],
      ['Script 3', 'THE FAMILY TRANSFER', '"Two thousand shillings. One word."', 30,
       'Split: Nairobi office vs rural home. He says "Tuma mama elfu mbili." Slot fills. Mother\'s M-Pesa beeps. She clasps her hands. Pure joy.',
       'Emotional, warm', 'Soft acoustic, heartfelt'],
      ['Script 4', 'THE PARKING UNLOCK', '"Paid before the engine stopped"', 27,
       'Luxury car parks in CBD. She scans QR on parking meter. Says "Confirm." App glows green. She steps out. Done.',
       'Sleek, confident', 'Corporate lo-fi, smooth'],
      ['Script 5', 'THE CHAMA MOMENT', '"She collects from 20 people at once"', 30,
       'Kitchen table. Taps Start Collection. 20 names turn green one by one — soft chimes. Taps Distribute. One name lights gold. Daraja sends.',
       'Energetic, communal', 'Afrobeats, warm percussion'],
      ['Script 6', 'THE BODA RIDER', '"No more \'I have no change\'"', 27,
       'Woman on boda scans fare board. Ongea Pesa reads KSh 150. Confirm. Rider\'s M-Pesa beeps. "Asante sana." She hops off. No coins exchanged.',
       'Street energy', 'Gengetone / urban Kenyan'],
      ['Script 7', 'THE ESCROW DEAL', '"KSh 500,000 locked until delivery. Smart."', 30,
       'Premium office, city view. Escrow created: KSh 500,000 locked. Both phones confirm. Goods arrive. Buyer taps Release. Funds land. "No disputes. No delays."',
       'Premium, serious', 'Cinematic strings'],
      ['Script 8', 'THE NIGHT MARKET VENDOR', '"He got paid at 11 PM. Instantly."', 28,
       'Nairobi night market, string lights. Customer scans vendor QR card. KSh 2,500. Confirm. Vendor\'s phone chimes. "Asante sana." Customer walks away happy.',
       'Warm, authentic', 'Afropop, vibrant'],
      ['Script 9', 'THE VOICE BIOMETRIC UNLOCK', '"Her voice is the key."', 28,
       'Step-up modal opens before large transfer. She chooses Voice. Waveform animation. Reads passphrase. Ring turns gold — "Voice matched ✓." Transfer: KSh 150,000. Done.',
       'Tech-forward, sleek', 'Minimal electronic'],
      ['Script 10', 'THE SCALE REVEAL', '"From parking to property. One app."', 30,
       'Fast montage of all 9 scenarios. Grid collapses to one phone. Voice: "Ongea Pesa." Aerial Nairobi sunrise. Full-screen: "Speak. Done." Logo. App store badges.',
       'Epic, building', 'Full orchestral swell'],
    ].flatMap(([num, title, tagline, duration, summary, energy, music]) => [
      heading(`${num} — ${title}`, HeadingLevel.HEADING_3),
      para(tagline, { bold: true, color: GOLD }),
      para(`Duration: ${duration}s  ·  Energy: ${energy}  ·  Music: ${music}`, { italic: true, color: CHARCOAL }),
      para(summary),
      rule(),
    ]),
  ]

  return new Document({ sections: [{ children }] })
}

// ─── Write files ──────────────────────────────────────────────────────────────

async function main() {
  const outDir = join(ROOT, 'docs')
  const mktDir = join(ROOT, 'docs/marketing')
  if (!existsSync(mktDir)) mkdirSync(mktDir, { recursive: true })

  console.log('📄 Generating FEATURES.docx …')
  const featuresBuffer = await Packer.toBuffer(buildFeaturesDoc())
  writeFileSync(join(outDir, 'FEATURES.docx'), featuresBuffer)
  console.log('  ✅ docs/FEATURES.docx written')

  console.log('📄 Generating FEATURE_GLOSSARY.docx …')
  const glossaryBuffer = await Packer.toBuffer(buildGlossaryDoc())
  writeFileSync(join(outDir, 'FEATURE_GLOSSARY.docx'), glossaryBuffer)
  console.log('  ✅ docs/FEATURE_GLOSSARY.docx written')

  console.log('📄 Generating MARKETING_PACK.docx …')
  const marketingBuffer = await Packer.toBuffer(buildMarketingDoc())
  writeFileSync(join(mktDir, 'MARKETING_PACK.docx'), marketingBuffer)
  console.log('  ✅ docs/marketing/MARKETING_PACK.docx written')

  console.log('\n✨ All DOCX files generated successfully.')
}

main().catch(err => { console.error('❌ DOCX generation failed:', err); process.exit(1) })

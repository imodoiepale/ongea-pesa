/**
 * test-emails.mjs — sends one of every branded email to a test address.
 * Run: node scripts/test-emails.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// ── Load env from .env.local ──────────────────────────────────────────────────
const envPath = join(root, '.env.local');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM          = process.env.RESEND_FROM ?? 'Ongea Pesa <ongeapesa@nsait.co.ke>';
const TO            = 'info@nsait.co.ke';
const SITE          = 'https://ongeapesa.nsait.co.ke';

if (!RESEND_API_KEY) {
  console.error('❌  RESEND_API_KEY not found in .env.local');
  process.exit(1);
}

const { Resend } = await import('resend');
const resend = new Resend(RESEND_API_KEY);

// ── Read Supabase template HTML and sub in example values ─────────────────────
function tpl(name, vars = {}) {
  let html = readFileSync(join(root, 'email-templates/supabase', name), 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{ .${k} }}`, v);
  }
  return html;
}

// ── Brand tokens (mirrors emailTemplates.ts) ──────────────────────────────────
const green = '#22c55e';
const ink   = '#0f172a';
const muted = '#64748b';
const bg    = '#f8fafc';
const card  = '#ffffff';

function layout({ title, preheader, body }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:${bg};">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="background-color:${green};border-radius:12px 12px 0 0;padding:28px 32px 24px;">
        <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#fff;">Ongea Pesa</p>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.4px;text-transform:uppercase;">Voice-Powered Payments</p>
      </td></tr>
      <tr><td style="background-color:${card};padding:32px 36px 28px;border-radius:0 0 12px 12px;">${body}</td></tr>
      <tr><td align="center" style="padding:24px 16px 8px;">
        <p style="margin:0 0 8px;font-size:12px;color:${muted};">
          <a href="${SITE}/privacy" style="color:${muted};text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
          <a href="${SITE}/terms" style="color:${muted};text-decoration:none;">Terms</a> &nbsp;·&nbsp;
          <a href="${SITE}/support" style="color:${muted};text-decoration:none;">Support</a>
        </p>
        <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; Ongea Pesa &mdash; nsait.co.ke</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Email definitions ─────────────────────────────────────────────────────────
const EXAMPLE_URL = `${SITE}/auth/callback?token=TEST_PREVIEW_TOKEN&type=signup`;

const emails = [
  {
    subject: '[TEST] Your Ongea Pesa verification code',
    label:   'OTP verification',
    html: layout({
      title:     'Your Ongea Pesa verification code',
      preheader: 'Your Ongea Pesa code is 847 291. Expires in 10 minutes.',
      body: `
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${ink};">Verification code</h2>
        <p style="margin:0 0 24px;font-size:15px;color:${muted};">Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
        <div style="background-color:${bg};border:1.5px solid #e2e8f0;border-radius:10px;padding:20px 0;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:${green};font-variant-numeric:tabular-nums;">847 291</span>
        </div>
        <p style="margin:0;font-size:13px;color:${muted};">If you did not request this code, you can safely ignore this email.</p>`,
    }),
  },
  {
    subject: '[TEST] Confirm your Ongea Pesa account',
    label:   'Confirm signup',
    html: tpl('confirm-signup.html', { ConfirmationURL: EXAMPLE_URL }),
  },
  {
    subject: '[TEST] Sign in to Ongea Pesa',
    label:   'Magic link',
    html: tpl('magic-link.html', { ConfirmationURL: EXAMPLE_URL }),
  },
  {
    subject: '[TEST] Reset your Ongea Pesa password',
    label:   'Reset password',
    html: tpl('reset-password.html', { ConfirmationURL: EXAMPLE_URL }),
  },
  {
    subject: '[TEST] Confirm your new Ongea Pesa email address',
    label:   'Change email',
    html: tpl('change-email.html', {
      ConfirmationURL: EXAMPLE_URL,
      Email:    'old@example.com',
      NewEmail: 'info@nsait.co.ke',
    }),
  },
  {
    subject: '[TEST] Your Ongea Pesa sign-in code',
    label:   'Reauthentication',
    html: tpl('reauthentication.html', { Token: '391 042' }),
  },
  {
    subject: "[TEST] You've been invited to Ongea Pesa",
    label:   'Invite',
    html: tpl('invite.html', { ConfirmationURL: EXAMPLE_URL }),
  },
];

// ── Send ──────────────────────────────────────────────────────────────────────
console.log(`\nSending ${emails.length} test emails to ${TO} from ${FROM}\n`);

let pass = 0, fail = 0;
for (const email of emails) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM, to: TO, subject: email.subject, html: email.html,
    });
    if (error) throw new Error(JSON.stringify(error));
    console.log(`  ✅  ${email.label}  (id: ${data.id})`);
    pass++;
  } catch (err) {
    console.error(`  ❌  ${email.label}  — ${err.message}`);
    fail++;
  }
}

console.log(`\n${pass} sent, ${fail} failed\n`);

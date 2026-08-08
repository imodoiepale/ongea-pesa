/**
 * Deliverability test harness.
 *
 * Sends one of the real email-templates/supabase/*.html files through Resend so
 * the new markup can be checked against Gmail's spam classifier and the
 * Authentication-Results header inspected.
 *
 * IMPORTANT: this exercises the Resend path only. It does NOT prove Supabase
 * Auth is using custom SMTP — the templates must still be pasted into
 * Supabase -> Authentication -> Email Templates for real auth mail to use them.
 *
 * Usage:  node scripts/send-test-email.mjs <to-address> [template-name]
 * e.g.    node scripts/send-test-email.mjs you@example.com confirm-signup
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resend } from 'resend'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Minimal .env.local reader — avoids adding a dotenv dependency for one script.
function loadEnvLocal() {
  const out = {}
  let raw
  try {
    raw = readFileSync(join(root, '.env.local'), 'utf8')
  } catch {
    return out
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[m[1]] = value
  }
  return out
}

const env = { ...loadEnvLocal(), ...process.env }

const to = process.argv[2]
const templateName = process.argv[3] || 'confirm-signup'

if (!to) {
  console.error('Usage: node scripts/send-test-email.mjs <to-address> [template-name]')
  process.exit(1)
}
if (!env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set in .env.local or the environment.')
  process.exit(1)
}

const SUBJECTS = {
  'confirm-signup': 'Confirm your Ongea Pesa account',
  'magic-link': 'Sign in to Ongea Pesa',
  'reset-password': 'Reset your Ongea Pesa password',
  'change-email': 'Confirm your new Ongea Pesa email address',
  'reauthentication': 'Your Ongea Pesa sign-in code',
  'invite': "You've been invited to Ongea Pesa",
}

const templatePath = join(root, 'email-templates', 'supabase', `${templateName}.html`)
let html = readFileSync(templatePath, 'utf8')

// Substitute the Supabase Go-template variables with realistic stand-ins so the
// rendered test message matches what a recipient would actually receive.
const site = 'https://ongeapesa.nsait.co.ke'
html = html
  .replaceAll('{{ .ConfirmationURL }}', `${site}/auth/confirm?token=deliverability-test`)
  .replaceAll('{{ .Token }}', '481902')
  .replaceAll('{{ .Email }}', to)
  .replaceAll('{{ .NewEmail }}', to)

// A text/plain alternative is required — HTML-only mail is a spam signal.
const text = [
  'Confirm your Ongea Pesa account.',
  '',
  `Open this link to confirm: ${site}/auth/confirm?token=deliverability-test`,
  '',
  'If you did not create an Ongea Pesa account, ignore this email.',
  '',
  'Ongea Pesa, a product of NSA IT Solutions - Nairobi, Kenya',
].join('\n')

const from = env.RESEND_FROM || 'Ongea Pesa <ongeapesa@nsait.co.ke>'
const replyTo = env.RESEND_REPLY_TO || 'info@nsait.co.ke'

const resend = new Resend(env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from,
  to,
  replyTo,
  subject: SUBJECTS[templateName] || 'Ongea Pesa',
  html,
  text,
})

if (error) {
  console.error('Send failed:', error)
  process.exit(1)
}

console.log(`Sent "${templateName}" to ${to}`)
console.log(`  from:     ${from}`)
console.log(`  reply-to: ${replyTo}`)
console.log(`  id:       ${data?.id}`)
console.log('')
console.log('Next: open the message in Gmail, click "Show original", and confirm')
console.log('spf=pass, dkim=pass, dmarc=pass with d=nsait.co.ke.')

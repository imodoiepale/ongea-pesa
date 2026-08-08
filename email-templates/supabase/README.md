# Ongea Pesa — Supabase Email Templates

Branded email templates for all Supabase Auth emails.  
All emails are routed through **Resend SMTP** from `ongeapesa@nsait.co.ke`.

---

## Step 1 — Add env vars to `.env.local`

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="Ongea Pesa <ongeapesa@nsait.co.ke>"
RESEND_REPLY_TO=info@nsait.co.ke
```

> The same API key is used for both the Resend SDK (custom OTP emails) and Supabase SMTP. Never commit it.

---

## Step 2 — Configure Supabase SMTP

**Supabase Dashboard → Project Settings → Authentication → SMTP Settings**

| Field | Value |
|---|---|
| Enable Custom SMTP | ✅ on |
| Sender email | `ongeapesa@nsait.co.ke` |
| Sender name | `Ongea Pesa` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Encryption | SSL/TLS |
| Username | `resend` |
| Password | *(your Resend API key — same as `RESEND_API_KEY`)* |

Click **Save** and then **Test SMTP** to confirm delivery.

---

## Step 3 — URL Configuration

**Supabase Dashboard → Authentication → URL Configuration**

| Field | Value |
|---|---|
| Site URL | `https://ongeapesa.nsait.co.ke` |
| Redirect URLs | `https://ongeapesa.nsait.co.ke/**` |
| Redirect URLs | `http://localhost:3000/**` *(dev)* |

---

## Step 4 — Email OTP Expiry

**Supabase Dashboard → Authentication → Providers → Email**

Set **OTP Expiry** → `600` seconds  
(matches the 10-minute TTL in `otp_codes.expires_at`).

---

## Step 5 — Paste templates into Supabase

**Supabase Dashboard → Authentication → Email Templates**

For each template below:
1. Select the template from the left sidebar.
2. Paste the **Subject** into the Subject field.
3. Open the matching `.html` file (same directory as this README), select all, and paste into the Body field.
4. Click **Save**.

| Supabase template | HTML file | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `Confirm your Ongea Pesa account` |
| Magic Link | `magic-link.html` | `Sign in to Ongea Pesa` |
| Change Email Address | `change-email.html` | `Confirm your new Ongea Pesa email address` |
| Reset Password | `reset-password.html` | `Reset your Ongea Pesa password` |
| Reauthentication | `reauthentication.html` | `Your Ongea Pesa sign-in code` |
| Invite User | `invite.html` | `You've been invited to Ongea Pesa` |

---

## Template variables used

Supabase injects Go-template variables into all templates.  
Each template uses only the variables documented here.

| Variable | Templates |
|---|---|
| `{{ .ConfirmationURL }}` | confirm-signup, magic-link, reset-password, change-email, invite |
| `{{ .Token }}` | reauthentication (renders the raw 6-digit code) |
| `{{ .Email }}` | change-email (old address) |
| `{{ .NewEmail }}` | change-email (new address) |

---

## Design tokens

| Token | Value | Usage |
|---|---|---|
| Brand green | `#22c55e` | Header bg, button bg, link color, OTP code |
| Dark green | `#16a34a` | (reserved for hover states) |
| Ink | `#0f172a` | Headings |
| Muted | `#64748b` | Body text, footer links |
| Background | `#f8fafc` | Outer page bg, code block bg |
| Card | `#ffffff` | Email body card |

The same tokens live in `lib/services/emailTemplates.ts` (used by the Resend SDK OTP email), keeping all emails visually consistent.

---

## Deliverability rules — do not regress these

These emails were being spam-foldered by Gmail. The markup is the part we
control, so anything added to these templates (or to `emailLayout()`) must keep
to the following:

- **No remote images.** The old templates pulled a 1600px hero background from
  `mp.astria.ai` — an unrelated third-party host, with a query string, referenced
  as a CSS background that Gmail strips anyway. Off-domain assets read as
  tracking pixels. If an image is ever needed, host it on `ongeapesa.nsait.co.ke`.
- **No `<style>` block, no `@keyframes`, no `animation:`.** Gmail discards head
  styles; the animations rendered nowhere and only added weight.
- **No `position:absolute` layering.** Tables and inline styles only.
- **Every send carries a `text/plain` alternative.** See `otpText()` in
  `lib/services/emailService.ts`.
- **No `List-Unsubscribe`.** These are transactional auth emails; an unsubscribe
  header on a password reset is wrong.

`lib/services/emailTemplates.ts` is the source of truth for the shell. The six
HTML files here must stay byte-comparable to its output — if you change one,
change both.

## DNS state (`nsait.co.ke`, verified 2026-08-06)

| Record | Value | Status |
|---|---|---|
| SPF (root) | `v=spf1 ip4:84.16.249.171 include:relay.mailbaby.net +a +mx ~all` | No SES include — fine, Resend bounces via `send.` |
| SPF (`send.`) | `v=spf1 include:amazonses.com ~all` | ✅ relaxed-aligns with `nsait.co.ke` |
| DKIM | `resend._domainkey.nsait.co.ke` | ✅ present, but 1024-bit — regenerate at 2048 |
| DMARC | `v=DMARC1; p=none;` | ⚠️ no `rua`, no enforcement |

**Outstanding DNS/dashboard work:**

1. Add reporting to DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@nsait.co.ke; fo=1`.
   After 1–2 weeks of clean reports, move to `p=quarantine; pct=25`, then ramp to 100.
2. Regenerate the Resend DKIM key at 2048-bit and update `resend._domainkey`.
3. Enrol `nsait.co.ke` in [Google Postmaster Tools](https://postmaster.google.com)
   — the only way to see Gmail's own reputation verdict.
4. Confirm custom SMTP is actually enabled (Step 2 above). If it is off, auth mail
   leaves from Supabase's shared sender and none of the above matters.

## Verification checklist

- [ ] Supabase SMTP test passes (Dashboard → Test SMTP)
- [ ] OTP email received from `ongeapesa@nsait.co.ke`, green header, correct code
- [ ] Signup confirmation arrives via Resend (check Resend dashboard → Logs)
- [ ] Password reset button links to `https://ongeapesa.nsait.co.ke/reset-password?...`
- [ ] Email headers: `From: ongeapesa@nsait.co.ke`, SPF=pass, DKIM=pass
- [ ] All 6 templates visually consistent (same header/footer/green)

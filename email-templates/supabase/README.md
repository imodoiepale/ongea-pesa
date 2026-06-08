# Ongea Pesa — Supabase Email Templates

Branded email templates for all Supabase Auth emails.  
All emails are routed through **Resend SMTP** from `ongeapesa@nsait.co.ke`.

---

## Step 1 — Add env vars to `.env.local`

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="Ongea Pesa <ongeapesa@nsait.co.ke>"
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

## Verification checklist

- [ ] Supabase SMTP test passes (Dashboard → Test SMTP)
- [ ] OTP email received from `ongeapesa@nsait.co.ke`, green header, correct code
- [ ] Signup confirmation arrives via Resend (check Resend dashboard → Logs)
- [ ] Password reset button links to `https://ongeapesa.nsait.co.ke/reset-password?...`
- [ ] Email headers: `From: ongeapesa@nsait.co.ke`, SPF=pass, DKIM=pass
- [ ] All 6 templates visually consistent (same header/footer/green)

// Server-only: never import in client components

/**
 * emailTemplates.ts
 * Single source of truth for Ongea Pesa email branding.
 * Used by emailService.ts (Resend SDK) and mirrored in
 * email-templates/supabase/*.html (Supabase dashboard templates).
 */

export const EMAIL_BRAND = {
  green:     '#10b981',
  greenDark: '#059669',
  ink:       '#0f172a',
  muted:     '#64748b',
  bg:        '#f8fafc',
  card:      '#ffffff',
  site:      'https://ongeapesa.nsait.co.ke',
  from:      'Ongea Pesa <ongeapesa@nsait.co.ke>',
} as const;

interface LayoutOptions {
  title:     string;
  preheader: string;
  bodyHtml:  string;
}

/**
 * Wraps body HTML in the full branded Ongea Pesa email shell.
 * Pure CSS text — no external images, so it renders everywhere.
 */
export function emailLayout({ title, preheader, bodyHtml }: LayoutOptions): string {
  const b = EMAIL_BRAND;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <style>
    @keyframes shimmer { 0% { background-position:-1000px 0 } 100% { background-position:1000px 0 } }
    @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
    @keyframes float   { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-10px) } }
    @keyframes scan    { 0% { transform:translateY(-100%) } 100% { transform:translateY(200%) } }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">

      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;">

        <!-- Hero header with image -->
        <tr>
          <td style="position:relative;padding:0;height:220px;background:url('https://mp.astria.ai/dv21aj7zth30898l03nastiai3g2?auto=compress&cs=tinysrgb&w=1600') no-repeat center center/cover;">
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(16,185,129,0.5) 0%,rgba(5,150,105,0.6) 100%);"></div>
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent);animation:scan 3s ease-in-out infinite;"></div>
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:20px 20px;"></div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="position:relative;z-index:2;height:220px;">
              <tr><td align="center" valign="middle" style="padding:30px;">
                <div style="margin-bottom:16px;text-align:center;">
                  <div style="display:inline-block;width:6px;height:6px;background:rgba(255,255,255,0.95);border-radius:50%;margin:0 3px;animation:pulse 1.5s ease-in-out infinite;"></div>
                  <div style="display:inline-block;width:6px;height:6px;background:rgba(255,255,255,0.95);border-radius:50%;margin:0 3px;animation:pulse 1.5s ease-in-out 0.2s infinite;"></div>
                  <div style="display:inline-block;width:6px;height:6px;background:rgba(255,255,255,0.95);border-radius:50%;margin:0 3px;animation:pulse 1.5s ease-in-out 0.4s infinite;"></div>
                </div>
                <h1 style="margin:0;font-size:38px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;text-shadow:0 2px 20px rgba(0,0,0,0.3);animation:float 3s ease-in-out infinite;">Ongea Pesa</h1>
                <div style="margin:10px 0 0;position:relative;display:inline-block;">
                  <p style="margin:0;font-size:16px;font-weight:400;color:rgba(255,255,255,0.98);letter-spacing:0.5px;">Voice-Powered Payments</p>
                  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);background-size:1000px 100%;animation:shimmer 2s infinite;"></div>
                </div>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Body card -->
        <tr>
          <td style="background-color:${b.card};padding:50px 40px;text-align:center;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,#e5e7eb,transparent);"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:30px;text-align:center;">
            <p style="margin:0 0 12px;font-size:13px;color:${b.muted};">&copy; 2025 Ongea Pesa. All rights reserved.</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              <a href="${b.site}/privacy" style="color:${b.green};text-decoration:none;margin:0 10px;">Privacy Policy</a>
              <span style="color:#d1d5db;">•</span>
              <a href="${b.site}/terms" style="color:${b.green};text-decoration:none;margin:0 10px;">Terms of Service</a>
              <span style="color:#d1d5db;">•</span>
              <a href="${b.site}/support" style="color:${b.green};text-decoration:none;margin:0 10px;">Support</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

/**
 * Returns the inner HTML for a one-time code email body.
 * Paste into emailLayout({ bodyHtml: otpBody(code) }).
 */
export function otpBody(code: string): string {
  const b = EMAIL_BRAND;
  return `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${b.ink};">Verification code</h2>
    <p style="margin:0 0 24px;font-size:15px;color:${b.muted};">Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>

    <!-- Code block -->
    <div style="background-color:${b.bg};border:1.5px solid #e2e8f0;border-radius:10px;padding:20px 0;text-align:center;margin-bottom:24px;">
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:${b.green};font-variant-numeric:tabular-nums;">${code}</span>
    </div>

    <p style="margin:0;font-size:13px;color:${b.muted};">If you did not request this code, you can safely ignore this email. Your account is not at risk.</p>`;
}

/**
 * Returns the inner HTML for a CTA-button email body.
 * Used by Supabase-style templates (exported for reference; actual HTML is in email-templates/supabase/).
 */
export function ctaBody(opts: {
  heading:  string;
  body:     string;
  ctaLabel: string;
  ctaUrl:   string;
  note?:    string;
}): string {
  const b = EMAIL_BRAND;
  return `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${b.ink};">${opts.heading}</h2>
    <p style="margin:0 0 28px;font-size:15px;color:${b.muted};">${opts.body}</p>

    <!-- CTA button -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-radius:8px;background-color:${b.green};">
          <a href="${opts.ctaUrl}"
             style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;line-height:1;">
            ${opts.ctaLabel}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:${b.muted};">Or copy and paste this URL into your browser:</p>
    <p style="margin:0 0 ${opts.note ? '20px' : '0'};font-size:12px;word-break:break-all;">
      <a href="${opts.ctaUrl}" style="color:${b.green};text-decoration:none;">${opts.ctaUrl}</a>
    </p>
    ${opts.note ? `<p style="margin:0;font-size:13px;color:${b.muted};">${opts.note}</p>` : ''}`;
}

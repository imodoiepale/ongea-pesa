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
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${b.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:${b.bg};">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${b.bg};padding:32px 0;">
    <tr><td align="center">

      <!-- Card -->
      <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr>
          <td align="center" style="background-color:${b.green};border-radius:12px 12px 0 0;padding:28px 32px 24px;">
            <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">
              Ongea Pesa
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.4px;text-transform:uppercase;">
              Voice-Powered Payments
            </p>
          </td>
        </tr>

        <!-- Body card -->
        <tr>
          <td style="background-color:${b.card};padding:32px 36px 28px;border-radius:0 0 12px 12px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 16px 8px;">
            <p style="margin:0 0 8px;font-size:12px;color:${b.muted};">
              <a href="${b.site}/privacy" style="color:${b.muted};text-decoration:none;">Privacy Policy</a>
              &nbsp;·&nbsp;
              <a href="${b.site}/terms" style="color:${b.muted};text-decoration:none;">Terms of Service</a>
              &nbsp;·&nbsp;
              <a href="${b.site}/support" style="color:${b.muted};text-decoration:none;">Support</a>
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              &copy; Ongea Pesa &mdash; sent by Ongea Pesa &middot; nsait.co.ke
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

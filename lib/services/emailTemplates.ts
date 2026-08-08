// Server-only: never import in client components

/**
 * emailTemplates.ts
 * Single source of truth for Ongea Pesa email branding.
 * Used by emailService.ts (Resend SDK) and mirrored in
 * email-templates/supabase/*.html (Supabase dashboard templates).
 *
 * Deliverability rules for anything added here — these emails were being
 * spam-foldered by Gmail and the markup is the main lever we control:
 *   - No remote images. Especially none from a domain other than the sending
 *     domain; an off-domain asset with a query string reads as a tracking pixel.
 *   - No <style> block, no @keyframes, no `animation:`. Gmail strips the head
 *     styles anyway, so they buy nothing and add weight.
 *   - No position:absolute layering. Layout is tables and inline styles only.
 *   - Every send must carry a text/plain alternative.
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
  replyTo:   'info@nsait.co.ke',
  /** Shown in the footer. Recipients and spam filters both expect a real sender identity. */
  entity:    'Ongea Pesa, a product of NSA IT Solutions',
  locality:  'Nairobi, Kenya',
} as const;

interface LayoutOptions {
  title:     string;
  preheader: string;
  bodyHtml:  string;
}

/**
 * Wraps body HTML in the full branded Ongea Pesa email shell.
 * Table-based, inline styles only, no external assets — renders everywhere
 * and keeps the spam score down.
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
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">${preheader}</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">

      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${b.card};border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding:40px 30px;background-color:${b.greenDark};background-image:linear-gradient(135deg,${b.green} 0%,${b.greenDark} 100%);">
            <h1 style="margin:0;font-size:32px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Ongea Pesa</h1>
            <p style="margin:8px 0 0;font-size:15px;color:#d1fae5;letter-spacing:0.3px;">Voice-Powered Payments</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color:${b.card};padding:44px 40px;text-align:center;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:28px 30px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:${b.muted};">${b.entity}</p>
            <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;">${b.locality} &middot; ${b.replyTo}</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              <a href="${b.site}/privacy" style="color:${b.green};text-decoration:none;margin:0 8px;">Privacy</a>
              <span style="color:#d1d5db;">&bull;</span>
              <a href="${b.site}/terms" style="color:${b.green};text-decoration:none;margin:0 8px;">Terms</a>
              <span style="color:#d1d5db;">&bull;</span>
              <a href="${b.site}/support" style="color:${b.green};text-decoration:none;margin:0 8px;">Support</a>
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
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${b.ink};">Verification code</h2>
    <p style="margin:0 0 24px;font-size:15px;color:${b.muted};line-height:1.6;">Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>

    <!-- Code block -->
    <div style="background-color:${b.bg};border:1px solid #e2e8f0;border-radius:10px;padding:20px 0;text-align:center;margin-bottom:24px;">
      <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:${b.greenDark};">${code}</span>
    </div>

    <p style="margin:0;font-size:13px;color:${b.muted};line-height:1.6;">If you did not request this code, you can safely ignore this email. Your account is not at risk.</p>`;
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
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:600;color:${b.ink};">${opts.heading}</h2>
    <p style="margin:0 auto 28px;max-width:440px;font-size:15px;color:${b.muted};line-height:1.7;">${opts.body}</p>

    <!-- CTA button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td style="border-radius:10px;background-color:${b.greenDark};">
          <a href="${opts.ctaUrl}"
             style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1;">
            ${opts.ctaLabel}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:${b.muted};">Or copy and paste this link into your browser:</p>
    <p style="margin:0 0 ${opts.note ? '20px' : '0'};font-size:12px;word-break:break-all;">
      <a href="${opts.ctaUrl}" style="color:${b.greenDark};text-decoration:none;">${opts.ctaUrl}</a>
    </p>
    ${opts.note ? `<p style="margin:0;font-size:13px;color:${b.muted};line-height:1.6;">${opts.note}</p>` : ''}`;
}

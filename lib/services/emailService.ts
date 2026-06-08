// Server-only: never import in client components

/**
 * emailService.ts
 * Sends OTP verification emails via the Resend API.
 * Lazy-initialises the Resend client so the module can be imported at build
 * time even when RESEND_API_KEY is not yet set (it throws only at call time).
 */

const DEFAULT_FROM = 'Ongea Pesa <no-reply@ongeapesa.com>';

function otpHtml(code: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a">Ongea Pesa Verification</h2>
  <p style="color:#555">Your one-time verification code is:</p>
  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#000;padding:16px 0">${code}</div>
  <p style="color:#555">This code expires in <strong>10 minutes</strong>.</p>
  <p style="color:#888;font-size:12px">If you did not request this code, please ignore this email.</p>
</div>`;
}

function otpText(code: string): string {
  return `Your Ongea Pesa code: ${code}. Expires in 10 minutes. If you did not request this, ignore this email.`;
}

/**
 * Sends a one-time verification code to the given email address.
 *
 * @throws {Error} if RESEND_API_KEY is not set or if the send request fails.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable is not set. ' +
        'Add it to .env.local before sending emails.'
    );
  }

  const from = process.env.RESEND_FROM ?? DEFAULT_FROM;

  // Lazy import — avoids top-level instantiation at build time.
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: 'Your Ongea Pesa verification code',
      html: otpHtml(code),
      text: otpText(code),
    });

    if (error) {
      // Do NOT include `error` details or `code` — they may leak sensitive info.
      throw new Error('Failed to send verification email');
    }
  } catch (err) {
    // Re-wrap any network / SDK errors without leaking code or API details.
    if (err instanceof Error && err.message === 'Failed to send verification email') {
      throw err;
    }
    throw new Error('Failed to send verification email');
  }
}

// Server-only: never import in client components

/**
 * emailService.ts
 * Sends OTP verification emails via the Resend API.
 * Lazy-initialises the Resend client so the module can be imported at build
 * time even when RESEND_API_KEY is not yet set (it throws only at call time).
 */

import { emailLayout, otpBody, EMAIL_BRAND } from './emailTemplates';

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

  const from = process.env.RESEND_FROM ?? EMAIL_BRAND.from;
  // A monitored reply address is a positive deliverability signal; a
  // send-only identity with nowhere to reply is not.
  const replyTo = process.env.RESEND_REPLY_TO ?? EMAIL_BRAND.replyTo;

  const html = emailLayout({
    title:     'Your Ongea Pesa verification code',
    preheader: `Your Ongea Pesa code is ${code}. Expires in 10 minutes.`,
    bodyHtml:  otpBody(code),
  });

  // Lazy import — avoids top-level instantiation at build time.
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      replyTo,
      subject: 'Your Ongea Pesa verification code',
      html,
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

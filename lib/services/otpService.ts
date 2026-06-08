// Server-only: never import in client components
import { SupabaseClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

export type OtpPurpose = 'login' | 'phone_setup';

/**
 * Generate a cryptographically random 6-digit OTP, hash it, and store it in
 * the otp_codes table. Returns the challengeId (row UUID) and the raw code.
 *
 * The raw code must be passed to the email service immediately; it is never
 * stored and must never be logged.
 */
export async function generateAndStoreOtp(
  admin: SupabaseClient,
  userId: string,
  email: string,
  purpose: OtpPurpose
): Promise<{ challengeId: string; code: string }> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const code_hash = await bcrypt.hash(code, 12);

  const { data: row, error } = await admin
    .from('otp_codes')
    .insert({ user_id: userId, email, code_hash, purpose })
    .select('id')
    .single();

  if (error || !row) {
    throw new Error(`[otpService] Failed to store OTP: ${error?.message ?? 'no row returned'}`);
  }

  return { challengeId: row.id as string, code };
}

/**
 * Verify an OTP against a stored challenge.
 *
 * Checks (in order): row existence, consumed flag, expiry, attempt limit,
 * bcrypt match. On match, marks the row consumed atomically to prevent
 * replay attacks.
 */
export async function verifyOtp(
  admin: SupabaseClient,
  challengeId: string,
  userId: string,
  code: string
): Promise<{ ok: boolean; reason?: 'not_found' | 'consumed' | 'expired' | 'max_attempts' | 'invalid' }> {
  const { data: row } = await admin
    .from('otp_codes')
    .select('id, user_id, code_hash, consumed, expires_at, attempts, max_attempts')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .single();

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }

  if (row.consumed) {
    return { ok: false, reason: 'consumed' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (row.attempts >= row.max_attempts) {
    return { ok: false, reason: 'max_attempts' };
  }

  const match = await bcrypt.compare(code, row.code_hash);

  if (!match) {
    // Increment attempt counter (best-effort; do not throw on failure)
    await admin
      .from('otp_codes')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);

    return { ok: false, reason: 'invalid' };
  }

  // Atomic consume: only succeeds if the row is still unconsumed (guards race conditions)
  const { data: updated } = await admin
    .from('otp_codes')
    .update({ consumed: true })
    .eq('id', row.id)
    .eq('consumed', false)
    .select('id')
    .single();

  if (!updated) {
    return { ok: false, reason: 'consumed' };
  }

  return { ok: true };
}

/**
 * Returns true if an unconsumed, unexpired OTP of this purpose already exists
 * for the user within the last `withinSeconds` seconds.
 *
 * Use this for throttling: if true, refuse to send a new OTP and return a
 * rate-limit error to the caller.
 */
export async function hasRecentOtp(
  admin: SupabaseClient,
  userId: string,
  purpose: OtpPurpose,
  withinSeconds: number = 60
): Promise<boolean> {
  const { data } = await admin
    .from('otp_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', new Date(Date.now() - withinSeconds * 1000).toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

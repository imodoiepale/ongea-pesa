import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { logSecurityEvent } from './auditService';

// Lockout policy
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const STEPUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type AttemptType = 'pin' | 'passkey' | 'login' | 'stepup' | 'voice';
export type StepupMethod = 'pin' | 'passkey' | 'voice';

interface ProfileLockState {
  failed_attempts: number | null;
  locked_until: string | null;
}

/** True if the profile is currently locked. */
export function isLocked(p: ProfileLockState | null | undefined): boolean {
  if (!p?.locked_until) return false;
  return new Date(p.locked_until).getTime() > Date.now();
}

/** Record an auth attempt (best-effort). */
export async function recordAttempt(
  supabase: SupabaseClient,
  userId: string,
  type: AttemptType,
  success: boolean,
  ip?: string | null
): Promise<void> {
  try {
    await supabase.from('auth_attempts').insert({ user_id: userId, type, success, ip: ip ?? null });
  } catch (err) {
    console.error('[securityService] recordAttempt failed:', err);
  }
}

/**
 * Register a failed attempt: increments profiles.failed_attempts and locks the
 * account once the threshold is crossed. Returns the new lock state.
 */
export async function registerFailure(
  supabase: SupabaseClient,
  userId: string,
  type: AttemptType,
  ip?: string | null
): Promise<{ locked: boolean; failedAttempts: number }> {
  await recordAttempt(supabase, userId, type, false, ip);

  const { data: profile } = await supabase
    .from('profiles')
    .select('failed_attempts, locked_until')
    .eq('id', userId)
    .single();

  const failedAttempts = (profile?.failed_attempts ?? 0) + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : profile?.locked_until ?? null;

  await supabase
    .from('profiles')
    .update({ failed_attempts: failedAttempts, locked_until: lockedUntil })
    .eq('id', userId);

  if (shouldLock) {
    await logSecurityEvent(
      { userId, eventType: 'account_locked', severity: 'critical', ip, metadata: { type, failedAttempts } },
      supabase
    );
  }

  return { locked: shouldLock, failedAttempts };
}

/** Clear failure counter + lock on a successful auth. */
export async function clearFailures(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('id', userId);
}

/** Issue a short-lived step-up token after a fresh PIN/passkey proof. */
export async function issueStepupToken(
  supabase: SupabaseClient,
  userId: string,
  method: StepupMethod,
  ip?: string | null
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await supabase.from('stepup_tokens').insert({
    user_id: userId,
    token,
    method,
    expires_at: new Date(Date.now() + STEPUP_TTL_MS).toISOString(),
  });
  await logSecurityEvent({ userId, eventType: 'stepup_issued', ip, metadata: { method } }, supabase);
  return token;
}

/**
 * Consume a step-up token. Returns true only if the token exists, belongs to
 * the user, is unconsumed and unexpired. Marks it consumed atomically-ish.
 */
export async function consumeStepupToken(
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<boolean> {
  if (!token) return false;

  const { data: row } = await supabase
    .from('stepup_tokens')
    .select('id, consumed, expires_at')
    .eq('user_id', userId)
    .eq('token', token)
    .single();

  if (!row || row.consumed) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  const { data: updated } = await supabase
    .from('stepup_tokens')
    .update({ consumed: true })
    .eq('id', row.id)
    .eq('consumed', false)
    .select('id')
    .single();

  if (!updated) return false;

  await logSecurityEvent({ userId, eventType: 'stepup_consumed', ip: null }, supabase);
  return true;
}

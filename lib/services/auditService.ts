import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'pin_set'
  | 'pin_verified'
  | 'pin_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'passkey_enrolled'
  | 'passkey_verified'
  | 'passkey_failed'
  | 'stepup_issued'
  | 'stepup_consumed'
  | 'voice_session_start'
  | 'voice_session_end'
  | 'money_send_initiated'
  | 'money_send_result'
  | 'face_enrolled'
  | 'fingerprint_enrolled'
  | 'voice_enrolled'
  | 'voice_verified'
  | 'voice_failed'
  | 'voice_revoked'
  | 'passkey_revoked'
  | string;

export interface SecurityEventInput {
  userId?: string | null;
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Append a row to public.security_events. Always uses the service-role client
 * so it works regardless of the caller's session. Never throws — logging must
 * not break the calling flow.
 */
export async function logSecurityEvent(
  input: SecurityEventInput,
  client?: SupabaseClient
): Promise<void> {
  try {
    const supabase = client ?? createServiceClient();
    await supabase.from('security_events').insert({
      user_id: input.userId ?? null,
      event_type: input.eventType,
      severity: input.severity ?? 'info',
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      device_id: input.deviceId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    // Best-effort: never let audit logging break the request.
    console.error('[auditService] failed to log security event:', err);
  }
}

/** Extract client IP + user-agent from a Next.js Request for audit context. */
export function requestContext(req: Request): { ip: string | null; userAgent: string | null } {
  const h = req.headers;
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null;
  return { ip, userAgent: h.get('user-agent') };
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import {
  isLocked,
  registerFailure,
  clearFailures,
  recordAttempt,
  issueStepupToken,
} from '@/lib/services/securityService';

// Verify the wallet PIN. On success returns a short-lived step-up token that
// gates money movement. On repeated failure the account locks (A5).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await request.json();
    const { ip, userAgent } = requestContext(request);
    const admin = createServiceClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('pin_hash, failed_attempts, locked_until')
      .eq('id', user.id)
      .single();

    if (isLocked(profile)) {
      return NextResponse.json(
        { error: 'Account temporarily locked. Try again later.', lockedUntil: profile!.locked_until },
        { status: 423 }
      );
    }

    if (!profile?.pin_hash) {
      return NextResponse.json({ error: 'No PIN set' }, { status: 400 });
    }

    const ok = await bcrypt.compare(String(pin ?? ''), profile.pin_hash);

    if (!ok) {
      const { locked } = await registerFailure(admin, user.id, 'pin', ip);
      await logSecurityEvent(
        { userId: user.id, eventType: 'pin_failed', severity: locked ? 'critical' : 'warning', ip, userAgent },
        admin
      );
      return NextResponse.json(
        { error: 'Incorrect PIN', locked },
        { status: locked ? 423 : 401 }
      );
    }

    await recordAttempt(admin, user.id, 'pin', true, ip);
    await clearFailures(admin, user.id);
    const stepupToken = await issueStepupToken(admin, user.id, 'pin', ip);
    await logSecurityEvent({ userId: user.id, eventType: 'pin_verified', ip, userAgent }, admin);

    return NextResponse.json({ success: true, stepupToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}

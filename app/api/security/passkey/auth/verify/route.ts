import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getRpConfig, consumeChallenge, b64url } from '@/lib/services/webauthn';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import {
  isLocked,
  registerFailure,
  clearFailures,
  recordAttempt,
  issueStepupToken,
} from '@/lib/services/securityService';

// Step 2 of passkey verification: verify the assertion, then issue a step-up
// token that gates money movement. Failures feed account lockout (A5).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { response } = await request.json();
    const { rpID, origin } = getRpConfig(request);
    const { ip, userAgent } = requestContext(request);
    const admin = createServiceClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('locked_until, failed_attempts')
      .eq('id', user.id)
      .single();
    if (isLocked(profile)) {
      return NextResponse.json({ error: 'Account temporarily locked', lockedUntil: profile!.locked_until }, { status: 423 });
    }

    const cred = response?.id
      ? (await admin
          .from('webauthn_credentials')
          .select('*')
          .eq('user_id', user.id)
          .eq('credential_id', response.id)
          .single()).data
      : null;

    if (!cred) {
      return NextResponse.json({ error: 'Unknown passkey' }, { status: 400 });
    }

    const expectedChallenge = await consumeChallenge(admin, user.id, 'authenticate');
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired, retry' }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: cred.credential_id,
        publicKey: b64url.toBuffer(cred.public_key),
        counter: Number(cred.counter ?? 0),
        transports: (cred.transports as any) ?? undefined,
      },
    });

    if (!verification.verified) {
      const { locked } = await registerFailure(admin, user.id, 'passkey', ip);
      await logSecurityEvent({ userId: user.id, eventType: 'passkey_failed', severity: locked ? 'critical' : 'warning', ip, userAgent }, admin);
      return NextResponse.json({ error: 'Passkey verification failed', locked }, { status: locked ? 423 : 401 });
    }

    await admin
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq('id', cred.id);

    await recordAttempt(admin, user.id, 'passkey', true, ip);
    await clearFailures(admin, user.id);
    const stepupToken = await issueStepupToken(admin, user.id, 'passkey', ip);
    await logSecurityEvent({ userId: user.id, eventType: 'passkey_verified', ip, userAgent }, admin);

    return NextResponse.json({ success: true, stepupToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}

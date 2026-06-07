import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getRpConfig, consumeChallenge, b64url } from '@/lib/services/webauthn';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';

// Step 2 of passkey enrollment: verify the attestation and store the credential.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { response, deviceLabel, modality } = await request.json();
    const { rpID, origin } = getRpConfig(request);
    const { ip, userAgent } = requestContext(request);
    const admin = createServiceClient();

    const expectedChallenge = await consumeChallenge(admin, user.id, 'register');
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired, retry' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await logSecurityEvent({ userId: user.id, eventType: 'passkey_failed', severity: 'warning', ip, userAgent }, admin);
      return NextResponse.json({ error: 'Passkey registration failed' }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const { error: insertError } = await admin.from('webauthn_credentials').insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: b64url.fromBuffer(credential.publicKey),
      counter: credential.counter ?? 0,
      transports: credential.transports ?? null,
      device_label: deviceLabel || `${credentialDeviceType}${credentialBackedUp ? ' (synced)' : ''}`,
      modality: modality || null,
    });
    if (insertError) {
      return NextResponse.json({ error: 'Failed to store passkey' }, { status: 500 });
    }

    await admin.from('profiles').update({ biometric_enabled: true }).eq('id', user.id);
    await logSecurityEvent({ userId: user.id, eventType: modality === 'face' ? 'face_enrolled' : modality === 'fingerprint' ? 'fingerprint_enrolled' : 'passkey_enrolled', ip, userAgent }, admin);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}

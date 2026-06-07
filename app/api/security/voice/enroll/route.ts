import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { isLocked } from '@/lib/services/securityService';
import { consumeChallenge } from '@/lib/services/webauthn';
import { getVoiceProvider } from '@/lib/services/voiceBiometrics/provider';
import { encryptProfile } from '@/lib/services/voiceBiometrics/crypto';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();
  const { ip, userAgent } = requestContext(request);

  // Lockout gate
  const { data: profile } = await admin
    .from('profiles')
    .select('locked_until, failed_attempts')
    .eq('id', user.id)
    .single();

  if (isLocked(profile)) {
    return NextResponse.json(
      { error: 'Account temporarily locked', lockedUntil: profile?.locked_until },
      { status: 423 }
    );
  }

  // Body: { frames: string[], consent: boolean }
  // frames: array of base64-encoded Int16Array PCM frames at 16kHz
  const body = await request.json();
  const { frames, consent } = body as { frames: string[]; consent: boolean };

  if (!consent) {
    return NextResponse.json({ error: 'Consent is required before voice biometric enrollment' }, { status: 400 });
  }

  if (!frames || frames.length < 3) {
    return NextResponse.json({ error: 'Insufficient audio samples. Please record at least 3 phrases.' }, { status: 400 });
  }

  // Consume voice challenge (anti-replay)
  const challenge = await consumeChallenge(admin, user.id, 'voice');
  if (!challenge) {
    return NextResponse.json({ error: 'Voice challenge expired or not found. Please try again.' }, { status: 400 });
  }

  // Decode base64 PCM frames → Int16Array[]
  const pcmFrames: Int16Array[] = frames.map((b64) => {
    const buf = Buffer.from(b64, 'base64');
    return new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  });

  const provider = getVoiceProvider();

  let enrollResult;
  try {
    enrollResult = await provider.enroll(pcmFrames);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Enrollment failed' }, { status: 422 });
  }

  // Encrypt the voiceprint before storage — raw audio/profile never persisted unencrypted
  const encrypted = encryptProfile(enrollResult.profileBuf);
  const consentAt = new Date().toISOString();

  // Upsert (one profile per user+provider)
  const { error: upsertErr } = await admin
    .from('voice_biometric_profiles')
    .upsert({
      user_id: user.id,
      provider: provider.provider,
      profile: encrypted.profile,
      iv: encrypted.iv,
      tag: encrypted.tag,
      sample_count: enrollResult.sampleCount,
      threshold: provider.threshold,
      consent_at: consentAt,
      enrolled_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

  if (upsertErr) {
    console.error('Voice enroll upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to save voice profile' }, { status: 500 });
  }

  await logSecurityEvent({
    userId: user.id,
    eventType: 'voice_enrolled',
    severity: 'info',
    ip,
    userAgent,
    metadata: { provider: provider.provider, sampleCount: enrollResult.sampleCount },
  });

  return NextResponse.json({ success: true });
}

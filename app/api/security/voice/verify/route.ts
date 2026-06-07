import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import {
  isLocked,
  registerFailure,
  clearFailures,
  recordAttempt,
  issueStepupToken,
} from '@/lib/services/securityService';
import { consumeChallenge } from '@/lib/services/webauthn';
import { getVoiceProvider } from '@/lib/services/voiceBiometrics/provider';
import { decryptProfile } from '@/lib/services/voiceBiometrics/crypto';

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

  // Load encrypted voice profile
  const { data: voiceProfile, error: profileErr } = await admin
    .from('voice_biometric_profiles')
    .select('profile, iv, tag, threshold, provider')
    .eq('user_id', user.id)
    .single();

  if (profileErr || !voiceProfile) {
    return NextResponse.json({ error: 'No voice biometric enrolled' }, { status: 400 });
  }

  // Body: { frames: string[] } — base64 PCM frames
  const { frames } = await request.json() as { frames: string[] };

  if (!frames || frames.length === 0) {
    return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
  }

  // Consume challenge (anti-replay)
  const challenge = await consumeChallenge(admin, user.id, 'voice');
  if (!challenge) {
    return NextResponse.json({ error: 'Voice challenge expired. Please request a new one.' }, { status: 400 });
  }

  // Decode PCM frames
  const pcmFrames: Int16Array[] = frames.map((b64) => {
    const buf = Buffer.from(b64, 'base64');
    return new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  });

  // Decrypt profile and score (server-side only — score never sent to client)
  let score: number;
  try {
    const profileBuf = decryptProfile({
      profile: voiceProfile.profile,
      iv: voiceProfile.iv,
      tag: voiceProfile.tag,
    });
    const provider = getVoiceProvider();
    score = await provider.score(profileBuf, pcmFrames);
  } catch (err: any) {
    console.error('Voice score error:', err);
    await registerFailure(admin, user.id, 'voice', ip);
    await logSecurityEvent({ userId: user.id, eventType: 'voice_failed', severity: 'warning', ip, userAgent });
    return NextResponse.json({ error: 'Voice verification failed' }, { status: 401 });
  }

  const threshold = voiceProfile.threshold ?? 0.5;

  if (score < threshold) {
    const { locked } = await registerFailure(admin, user.id, 'voice', ip);
    await logSecurityEvent({
      userId: user.id,
      eventType: 'voice_failed',
      severity: locked ? 'critical' : 'warning',
      ip,
      userAgent,
      metadata: { score, threshold },
    });
    if (locked) {
      const { data: fresh } = await admin.from('profiles').select('locked_until').eq('id', user.id).single();
      return NextResponse.json(
        { error: 'Account temporarily locked due to failed attempts', lockedUntil: fresh?.locked_until },
        { status: 423 }
      );
    }
    return NextResponse.json({ error: 'Voice did not match enrolled profile' }, { status: 401 });
  }

  // Score passed — issue step-up token
  await recordAttempt(admin, user.id, 'voice', true, ip);
  await clearFailures(admin, user.id);

  // Update last_used_at
  await admin
    .from('voice_biometric_profiles')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', user.id);

  const stepupToken = await issueStepupToken(admin, user.id, 'voice', ip);

  await logSecurityEvent({
    userId: user.id,
    eventType: 'voice_verified',
    severity: 'info',
    ip,
    userAgent,
    metadata: { score, threshold },
  });

  return NextResponse.json({ success: true, stepupToken });
}

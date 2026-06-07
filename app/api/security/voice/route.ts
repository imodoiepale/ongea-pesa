import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();
  const { data } = await admin
    .from('voice_biometric_profiles')
    .select('provider, sample_count, consent_at, enrolled_at, last_used_at')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    enrolled: !!data,
    profile: data
      ? {
          provider: data.provider,
          sampleCount: data.sample_count,
          consentAt: data.consent_at,
          enrolledAt: data.enrolled_at,
          lastUsedAt: data.last_used_at,
        }
      : null,
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();
  const { ip, userAgent } = requestContext(request);

  const { error: deleteErr } = await admin
    .from('voice_biometric_profiles')
    .delete()
    .eq('user_id', user.id);

  if (deleteErr) return NextResponse.json({ error: 'Failed to delete voice profile' }, { status: 500 });

  await logSecurityEvent({
    userId: user.id,
    eventType: 'voice_revoked',
    severity: 'info',
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true });
}

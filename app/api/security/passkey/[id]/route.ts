import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();
  const { ip, userAgent } = requestContext(request);

  // Verify the credential belongs to this user before deleting
  const { data: cred, error: fetchErr } = await admin
    .from('webauthn_credentials')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !cred) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  const { error: deleteErr } = await admin
    .from('webauthn_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteErr) return NextResponse.json({ error: 'Failed to revoke credential' }, { status: 500 });

  // If no credentials remain, unset biometric_enabled
  const { count } = await admin
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (count === 0) {
    await admin.from('profiles').update({ biometric_enabled: false }).eq('id', user.id);
  }

  await logSecurityEvent({ userId: user.id, eventType: 'passkey_revoked', severity: 'info', ip, userAgent });

  return NextResponse.json({ success: true });
}

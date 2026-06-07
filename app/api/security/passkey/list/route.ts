import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();
  const { data: creds, error } = await admin
    .from('webauthn_credentials')
    .select('id, device_label, modality, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });

  // Never return public_key, credential_id, counter, or transports to the browser
  return NextResponse.json({ credentials: creds ?? [] });
}

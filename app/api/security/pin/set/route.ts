import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';

// Set or change the wallet PIN. Requires an authenticated session.
// If a PIN already exists, the current PIN must be supplied to change it.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin, currentPin } = await request.json();
    const { ip, userAgent } = requestContext(request);

    if (!/^\d{4,6}$/.test(String(pin ?? ''))) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('pin_hash')
      .eq('id', user.id)
      .single();

    // Changing an existing PIN requires the current PIN.
    if (profile?.pin_hash) {
      const ok = currentPin && (await bcrypt.compare(String(currentPin), profile.pin_hash));
      if (!ok) {
        return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 403 });
      }
    }

    const hash = await bcrypt.hash(String(pin), 12);
    const { error: updateError } = await admin
      .from('profiles')
      .update({ pin_hash: hash })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 });
    }

    await logSecurityEvent(
      { userId: user.id, eventType: 'pin_set', severity: 'info', ip, userAgent },
      admin
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to set PIN' }, { status: 500 });
  }
}

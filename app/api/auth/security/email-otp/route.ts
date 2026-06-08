import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/services/auditService';

// Toggle the per-user email_otp_enabled flag. When disabled, phone login skips
// the email OTP step and bridges straight to a session. Session required.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceClient();
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ email_otp_enabled: enabled })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    await logSecurityEvent(
      { userId: user.id, eventType: 'email_otp_toggle', severity: 'info', metadata: { enabled } },
      admin
    );

    return NextResponse.json({ success: true, email_otp_enabled: enabled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update setting' }, { status: 500 });
  }
}

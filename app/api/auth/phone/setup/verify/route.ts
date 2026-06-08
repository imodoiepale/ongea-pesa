import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { normalizePhone, displayPhone } from '@/lib/phone';
import { verifyOtp } from '@/lib/services/otpService';

// Confirm the setup OTP and commit the phone number (phone_number + mpesa_number)
// to the authenticated user's profile. Session required.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceClient();
    const { challengeId, code, phone } = await request.json();

    if (!challengeId || !code || !phone) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const { data: otpRow } = await admin
      .from('otp_codes')
      .select('user_id, purpose')
      .eq('id', challengeId)
      .eq('consumed', false)
      .single();

    if (!otpRow || otpRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    const result = await verifyOtp(admin, challengeId, user.id, code);

    if (!result.ok) {
      const status = result.reason === 'max_attempts' ? 423 : 401;
      return NextResponse.json({ error: 'Invalid or expired code' }, { status });
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ phone_number: normalized, mpesa_number: normalized, phone_verified: true })
      .eq('id', user.id);

    if (updateError) {
      if ((updateError as any).code === '23505') {
        return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to link phone number' }, { status: 500 });
    }

    await logSecurityEvent(
      {
        userId: user.id,
        eventType: 'phone_linked',
        severity: 'info',
        ip: requestContext(request).ip,
        metadata: { phone: normalized },
      },
      admin
    );

    return NextResponse.json({ success: true, phone: displayPhone(normalized) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}

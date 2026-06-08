import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { normalizePhone } from '@/lib/phone';
import { generateAndStoreOtp, hasRecentOtp } from '@/lib/services/otpService';
import { sendOtpEmail } from '@/lib/services/emailService';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.charAt(0) + '***@' + domain;
}

// First-time phone setup. Sets the PIN now and dispatches an email OTP; the
// phone number itself is only committed after OTP confirmation (setup/verify).
// Session required.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceClient();
    const { ip, userAgent } = requestContext(request);
    const { phone, pin } = await request.json();

    if (!/^\d{4}$/.test(String(pin ?? ''))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', normalized)
      .neq('id', user.id)
      .single();

    if (taken) {
      return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
    }

    const hash = await bcrypt.hash(String(pin), 12);
    const { error: updateError } = await admin
      .from('profiles')
      .update({ pin_hash: hash, pin_set_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 });
    }

    if (await hasRecentOtp(admin, user.id, 'phone_setup', 60)) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    const { challengeId, code } = await generateAndStoreOtp(admin, user.id, user.email!, 'phone_setup');
    await sendOtpEmail(user.email!, code);

    await logSecurityEvent(
      { userId: user.id, eventType: 'pin_set', severity: 'info', ip, userAgent },
      admin
    );

    return NextResponse.json({
      success: true,
      challengeId,
      emailHint: maskEmail(user.email!),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Setup failed' }, { status: 500 });
  }
}

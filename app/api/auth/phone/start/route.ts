import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { normalizePhone } from '@/lib/phone';
import { isLocked, registerFailure, clearFailures } from '@/lib/services/securityService';
import { generateAndStoreOtp, hasRecentOtp } from '@/lib/services/otpService';
import { sendOtpEmail } from '@/lib/services/emailService';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.charAt(0) + '***@' + domain;
}

// Phone + PIN login. Verifies the PIN against the profile keyed by phone, then
// dispatches an email OTP (or a magic-link bridge when OTP is disabled).
// No session required — this is the entry point of the login flow.
export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();
    const { ip, userAgent } = requestContext(request);
    const admin = createServiceClient();

    const normalized = normalizePhone(phone);
    if (!normalized) {
      // Generic error to avoid phone-number enumeration.
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }

    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, email, pin_hash, email_otp_enabled, phone_verified, failed_attempts, locked_until')
      .eq('phone_number', normalized)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }

    if (isLocked(profile)) {
      return NextResponse.json({ error: 'Account locked. Try again later.' }, { status: 423 });
    }

    if (!profile.pin_hash) {
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }

    const ok = await bcrypt.compare(String(pin ?? ''), profile.pin_hash);

    if (!ok) {
      const { locked } = await registerFailure(admin, profile.id, 'login', ip);
      return NextResponse.json(
        { error: locked ? 'Account locked. Try again later.' : 'Invalid phone or PIN' },
        { status: locked ? 423 : 401 }
      );
    }

    await clearFailures(admin, profile.id);

    if (await hasRecentOtp(admin, profile.id, 'login', 60)) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    // OTP disabled: skip the code and hand back a magic-link bridge directly.
    if (profile.email_otp_enabled === false) {
      const { data, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
      });
      if (linkError || !data?.properties?.hashed_token) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }
      await logSecurityEvent(
        { userId: profile.id, eventType: 'login', severity: 'info', ip, userAgent, metadata: { method: 'phone_pin_magiclink' } },
        admin
      );
      return NextResponse.json({
        success: true,
        token_hash: data.properties.hashed_token,
        type: 'email',
        otpRequired: false,
      });
    }

    const { challengeId, code } = await generateAndStoreOtp(admin, profile.id, profile.email, 'login');
    await sendOtpEmail(profile.email, code);

    await logSecurityEvent(
      { userId: profile.id, eventType: 'login', severity: 'info', ip, userAgent, metadata: { method: 'phone_pin_otp' } },
      admin
    );

    return NextResponse.json({
      success: true,
      challengeId,
      emailHint: maskEmail(profile.email),
      otpRequired: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}

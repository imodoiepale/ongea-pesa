import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { verifyOtp } from '@/lib/services/otpService';

// Verify the 6-digit login OTP and return a session-bridge token_hash that the
// client exchanges for a Supabase session. No session required.
export async function POST(request: NextRequest) {
  try {
    const { challengeId, code } = await request.json();
    const admin = createServiceClient();

    if (!challengeId || !code) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const { data: otpRow } = await admin
      .from('otp_codes')
      .select('user_id, email, purpose')
      .eq('id', challengeId)
      .eq('consumed', false)
      .single();

    if (!otpRow) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    const result = await verifyOtp(admin, challengeId, otpRow.user_id, code);

    if (!result.ok) {
      const status = result.reason === 'max_attempts' ? 423 : 401;
      return NextResponse.json({ error: 'Invalid or expired code' }, { status });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', otpRow.user_id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    const token_hash = linkData.properties.hashed_token;

    await logSecurityEvent(
      {
        userId: otpRow.user_id,
        eventType: 'login',
        severity: 'info',
        ip: requestContext(request).ip,
        metadata: { method: 'phone_otp_verified' },
      },
      admin
    );

    return NextResponse.json({ success: true, token_hash, type: 'email' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}

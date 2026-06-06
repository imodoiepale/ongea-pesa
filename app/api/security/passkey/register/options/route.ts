import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getRpConfig, saveChallenge, b64url } from '@/lib/services/webauthn';

// Step 1 of passkey enrollment: return registration options for the browser.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rpID, rpName } = getRpConfig(request);
    const admin = createServiceClient();

    const { data: existing } = await admin
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email || user.id,
      attestationType: 'none',
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports as any) ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred', // device biometric (Face/Touch ID) when available
      },
    });

    await saveChallenge(admin, user.id, options.challenge, 'register');
    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to start enrollment' }, { status: 500 });
  }
}

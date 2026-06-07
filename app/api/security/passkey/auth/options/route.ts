import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getRpConfig, saveChallenge } from '@/lib/services/webauthn';
import { isLocked } from '@/lib/services/securityService';

// Step 1 of passkey verification (step-up): return authentication options.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const modality: string | undefined = body?.modality ?? undefined;
    const { rpID } = getRpConfig(request);
    const admin = createServiceClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('locked_until, failed_attempts')
      .eq('id', user.id)
      .single();
    if (isLocked(profile)) {
      return NextResponse.json({ error: 'Account temporarily locked', lockedUntil: profile!.locked_until }, { status: 423 });
    }

    let credQuery = admin
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);
    if (modality) {
      credQuery = credQuery.eq('modality', modality);
    }
    const { data: creds } = await credQuery;

    if (!creds || creds.length === 0) {
      return NextResponse.json({ error: 'No passkey enrolled' }, { status: 400 });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: (c.transports as any) ?? undefined,
      })),
    });

    await saveChallenge(admin, user.id, options.challenge, 'authenticate');
    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to start verification' }, { status: 500 });
  }
}

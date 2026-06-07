import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { saveChallenge } from '@/lib/services/webauthn';
import { isLocked } from '@/lib/services/securityService';

const VERIFICATION_PHRASES = [
  'Tuma pesa yangu sasa hivi.',
  'Ninathibitisha malipo haya.',
  'Sauti yangu ni uthibitisho wangu.',
  'Confirm this payment with my voice.',
  'I authorize this transaction now.',
  'Thibitisha akaunti yangu leo.',
  'Send this payment immediately.',
  'Malipo haya ni ya kweli kabisa.',
];

function randomPhrase(): string {
  return VERIFICATION_PHRASES[Math.floor(Math.random() * VERIFICATION_PHRASES.length)];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceClient();

  // Lockout gate
  const { data: profile } = await admin
    .from('profiles')
    .select('locked_until, failed_attempts')
    .eq('id', user.id)
    .single();

  if (isLocked(profile)) {
    return NextResponse.json(
      { error: 'Account temporarily locked', lockedUntil: profile?.locked_until },
      { status: 423 }
    );
  }

  const phrase = randomPhrase();
  await saveChallenge(admin, user.id, phrase, 'voice');

  return NextResponse.json({ phrase });
}

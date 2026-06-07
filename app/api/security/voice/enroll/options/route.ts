import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { saveChallenge } from '@/lib/services/webauthn';

// Bilingual enrollment phrases (English/Swahili)
const ENROLLMENT_PHRASES = [
  'Tuma elfu moja kwa baba.',
  'Lipa bili ya stima leo.',
  'Akaunti yangu iko salama.',
  'Ninataka kutuma pesa sasa.',
  'Sauti yangu ni ufunguo wangu.',
  'Send money to my family now.',
  'My voice is my password.',
  'Pay the electricity bill today.',
  'Transfer one thousand shillings.',
  'Confirm my identity with voice.',
];

function randomPhrase(): string {
  return ENROLLMENT_PHRASES[Math.floor(Math.random() * ENROLLMENT_PHRASES.length)];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const phrase = randomPhrase();
  const admin = createServiceClient();
  // Store phrase as the "challenge" for voice enrollment
  await saveChallenge(admin, user.id, phrase, 'voice');

  return NextResponse.json({ phrase });
}

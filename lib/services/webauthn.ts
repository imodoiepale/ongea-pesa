import { SupabaseClient } from '@supabase/supabase-js';

// RP (Relying Party) config. In dev rpID is 'localhost'; in prod set
// WEBAUTHN_RP_ID + WEBAUTHN_ORIGIN env vars to your domain.
export function getRpConfig(request: Request): { rpID: string; origin: string; rpName: string } {
  const rpName = 'Ongea Pesa';

  const envRpId = process.env.WEBAUTHN_RP_ID;
  const envOrigin = process.env.WEBAUTHN_ORIGIN;
  if (envRpId && envOrigin) {
    return { rpID: envRpId, origin: envOrigin, rpName };
  }

  // Derive from the request's Origin header.
  const originHeader = request.headers.get('origin') || '';
  try {
    const url = new URL(originHeader);
    return { rpID: url.hostname, origin: originHeader, rpName };
  } catch {
    return { rpID: 'localhost', origin: 'http://localhost:3000', rpName };
  }
}

export const b64url = {
  fromBuffer(buf: Uint8Array): string {
    return Buffer.from(buf).toString('base64url');
  },
  toBuffer(s: string): Uint8Array<ArrayBuffer> {
    // Allocate a fresh ArrayBuffer-backed Uint8Array (satisfies @simplewebauthn's
    // Uint8Array<ArrayBuffer> typing, not Uint8Array<ArrayBufferLike>).
    const src = Buffer.from(s, 'base64url');
    const buf = new ArrayBuffer(src.byteLength);
    const out = new Uint8Array(buf);
    out.set(src);
    return out;
  },
};

/** Store a ceremony challenge (best-effort). */
export async function saveChallenge(
  supabase: SupabaseClient,
  userId: string,
  challenge: string,
  purpose: 'register' | 'authenticate'
): Promise<void> {
  await supabase.from('webauthn_challenges').insert({ user_id: userId, challenge, purpose });
}

/** Fetch + delete the most recent unexpired challenge for a user/purpose. */
export async function consumeChallenge(
  supabase: SupabaseClient,
  userId: string,
  purpose: 'register' | 'authenticate'
): Promise<string | null> {
  const { data } = await supabase
    .from('webauthn_challenges')
    .select('id, challenge, expires_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  await supabase.from('webauthn_challenges').delete().eq('id', data.id);
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.challenge;
}

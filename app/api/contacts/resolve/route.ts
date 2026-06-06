/**
 * GET /api/contacts/resolve?q=<name_or_phone>
 *
 * Server-side contact name resolution used by the voice batch route.
 * Returns the single best-match personal contact for the query string.
 * Uses a simple substring + trigram rank — no client-side Fuse needed on server.
 *
 * Response: { match: { id, display_name, phone, normalized_phone } | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone, displayPhone } from '@/lib/phone';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (!q) {
      return NextResponse.json({ match: null });
    }

    // If q looks like a phone number, try exact normalized match first
    const norm = normalizePhone(q);
    if (norm) {
      const { data: exact } = await supabase
        .from('personal_contacts')
        .select('id, display_name, phone, normalized_phone')
        .eq('user_id', user.id)
        .eq('normalized_phone', norm)
        .limit(1)
        .maybeSingle();

      if (exact) {
        return NextResponse.json({ match: exact });
      }
    }

    // Name search — ilike for partial match, ordered by best match (simplest approach)
    const { data: rows, error } = await supabase
      .from('personal_contacts')
      .select('id, display_name, phone, normalized_phone')
      .eq('user_id', user.id)
      .ilike('display_name', `%${q}%`)
      .order('display_name', { ascending: true })
      .limit(5);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ match: null, warning: 'Migration 017 not applied' });
      }
      throw error;
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ match: null });
    }

    // Pick the row whose display_name starts with the query (more specific = better)
    const qLower = q.toLowerCase();
    const best =
      rows.find(r => r.display_name.toLowerCase().startsWith(qLower)) ??
      rows[0];

    return NextResponse.json({ match: best });
  } catch (e: any) {
    console.error('[contacts/resolve]', e.message);
    return NextResponse.json({ error: 'Resolve failed', details: e.message }, { status: 500 });
  }
}

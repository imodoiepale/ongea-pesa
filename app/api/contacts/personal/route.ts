/**
 * /api/contacts/personal
 *
 * GET  — list the authenticated user's personal contacts
 * POST — bulk-upsert contacts (import from device / vCard / CSV)
 * DELETE ?id=<uuid> — remove a single contact by id
 *
 * Table: public.personal_contacts (RLS: owner-only)
 * Migration: database/migrations/017_personal_contacts.sql
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone, displayPhone } from '@/lib/phone';

// ── GET /api/contacts/personal ─────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('personal_contacts')
      .select('id, display_name, phone, normalized_phone, source, created_at')
      .eq('user_id', user.id)
      .order('display_name', { ascending: true });

    if (error) {
      // Table not yet created — return empty list gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ contacts: [], total: 0, warning: 'Table not yet created — apply migration 017_personal_contacts.sql' });
      }
      throw error;
    }

    return NextResponse.json({ contacts: data ?? [], total: data?.length ?? 0 });
  } catch (e: any) {
    console.error('[personal/GET]', e.message);
    return NextResponse.json({ error: 'Failed to fetch contacts', details: e.message }, { status: 500 });
  }
}

// ── POST /api/contacts/personal — bulk upsert ──────────────────────────────────

interface ImportContact { name: string; phone: string }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contacts, source = 'manual' } = body as { contacts?: ImportContact[]; source?: string };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'contacts[] is required and must be non-empty' }, { status: 400 });
    }

    // Normalize, validate, deduplicate within the incoming batch
    const seenInBatch = new Set<string>();
    const rows: { user_id: string; display_name: string; phone: string; normalized_phone: string; source: string }[] = [];
    let skippedEmpty = 0;
    let skippedDupeInBatch = 0;

    for (const c of contacts) {
      const norm = normalizePhone(c.phone ?? '');
      if (!norm) { skippedEmpty++; continue; }
      if (seenInBatch.has(norm)) { skippedDupeInBatch++; continue; }
      seenInBatch.add(norm);

      rows.push({
        user_id: user.id,
        display_name: (c.name ?? '').trim() || displayPhone(norm),
        phone: displayPhone(norm),
        normalized_phone: norm,
        source,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: skippedEmpty + skippedDupeInBatch,
        total: 0,
        message: 'No valid phone numbers found in the import.',
      });
    }

    // Upsert — conflict on (user_id, normalized_phone) updates name + source
    const { data: upserted, error } = await supabase
      .from('personal_contacts')
      .upsert(rows, {
        onConflict: 'user_id,normalized_phone',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Migration 017_personal_contacts.sql has not been applied yet.' }, { status: 500 });
      }
      throw error;
    }

    const imported = upserted?.length ?? rows.length;

    return NextResponse.json({
      imported,
      skipped: skippedEmpty + skippedDupeInBatch,
      total: imported,
      message: `Imported ${imported} contact${imported !== 1 ? 's' : ''}.`,
    });
  } catch (e: any) {
    console.error('[personal/POST]', e.message);
    return NextResponse.json({ error: 'Import failed', details: e.message }, { status: 500 });
  }
}

// ── DELETE /api/contacts/personal?id=<uuid> ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('personal_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // RLS + belt-and-suspenders

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[personal/DELETE]', e.message);
    return NextResponse.json({ error: 'Delete failed', details: e.message }, { status: 500 });
  }
}

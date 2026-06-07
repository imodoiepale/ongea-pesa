import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';

/**
 * GET /api/dependants
 * List all dependants for the authenticated user.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('dependants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/dependants error:', error);
      return NextResponse.json({ error: 'Failed to fetch dependants' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dependants: data ?? [] });
  } catch (err: any) {
    console.error('GET /api/dependants unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

/**
 * POST /api/dependants
 * Add a dependant.
 * Body: { display_name: string, phone: string, relationship?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, phone, relationship } = body as {
      display_name?: string;
      phone?: string;
      relationship?: string;
    };

    if (!display_name?.trim()) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const normalized_phone = normalizePhone(phone.trim());
    if (!normalized_phone) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a valid Kenyan number (07xx or 254xx).' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('dependants')
      .insert({
        user_id: user.id,
        display_name: display_name.trim(),
        phone: phone.trim(),
        normalized_phone,
        relationship: relationship?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation — duplicate phone for this user
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A dependant with phone ${phone} is already saved.` },
          { status: 409 }
        );
      }
      console.error('POST /api/dependants error:', error);
      return NextResponse.json({ error: 'Failed to add dependant' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dependant: data }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/dependants unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/dependants
 * Increment total_contributed for a dependant after a confirmed top-up.
 * Body: { id: string, increment_contribution: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, increment_contribution } = body as {
      id?: string;
      increment_contribution?: number;
    };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const amount = Number(increment_contribution);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'increment_contribution must be a positive number' }, { status: 400 });
    }

    // First verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('dependants')
      .select('id, total_contributed')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Dependant not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('dependants')
      .update({
        total_contributed: Number(existing.total_contributed) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('PATCH /api/dependants error:', error);
      return NextResponse.json({ error: 'Failed to update contribution' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dependant: data });
  } catch (err: any) {
    console.error('PATCH /api/dependants unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/dependants
 * Remove a dependant.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dependants')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('DELETE /api/dependants error:', error);
      return NextResponse.json({ error: 'Failed to delete dependant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/dependants unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

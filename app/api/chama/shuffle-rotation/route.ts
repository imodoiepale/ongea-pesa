import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Shuffle Rotation - Randomly reorder member rotation positions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chama_id } = await request.json();

    if (!chama_id) {
      return NextResponse.json({ error: 'Missing chama_id' }, { status: 400 });
    }

    // Get chama with members
    const { data: chama, error: chamaError } = await supabase
      .from('chamas')
      .select('*, members:chama_members(*)')
      .eq('id', chama_id)
      .single();

    if (chamaError || !chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 });
    }

    if (chama.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only admin can shuffle rotation' }, { status: 403 });
    }

    if (chama.rotation_type !== 'random') {
      return NextResponse.json({ error: 'Rotation type must be "random" to shuffle' }, { status: 400 });
    }

    const members = chama.members || [];
    if (members.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 members to shuffle' }, { status: 400 });
    }

    // Fisher-Yates shuffle
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update rotation positions
    for (let i = 0; i < shuffled.length; i++) {
      await supabase
        .from('chama_members')
        .update({ rotation_position: i + 1 })
        .eq('id', shuffled[i].id);
    }

    // Reset rotation index
    await supabase
      .from('chamas')
      .update({ current_rotation_index: 0, updated_at: new Date().toISOString() })
      .eq('id', chama_id);

    console.log('🔀 Rotation shuffled for chama:', chama_id);

    return NextResponse.json({
      success: true,
      message: 'Rotation order shuffled',
      new_order: shuffled.map((m, i) => ({ position: i + 1, name: m.name, phone: m.phone_number })),
    });

  } catch (error: any) {
    console.error('❌ Shuffle rotation error:', error);
    return NextResponse.json({ error: 'Failed to shuffle rotation', details: error.message }, { status: 500 });
  }
}

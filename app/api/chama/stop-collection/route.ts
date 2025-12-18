import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Stop Collection - Cancel an active collection cycle
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chama_id, cycle_id } = await request.json();

    if (!chama_id) {
      return NextResponse.json({ error: 'Missing chama_id' }, { status: 400 });
    }

    // Get chama to verify admin
    const { data: chama, error: chamaError } = await supabase
      .from('chamas')
      .select('*')
      .eq('id', chama_id)
      .single();

    if (chamaError || !chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 });
    }

    if (chama.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only admin can stop collection' }, { status: 403 });
    }

    // Find active cycle
    let cycleQuery = supabase
      .from('chama_cycles')
      .select('*')
      .eq('chama_id', chama_id)
      .in('status', ['collecting', 'collected']);

    if (cycle_id) {
      cycleQuery = cycleQuery.eq('id', cycle_id);
    }

    const { data: cycle, error: cycleError } = await cycleQuery.single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'No active collection cycle found' }, { status: 404 });
    }

    // Update cycle status to cancelled
    await supabase
      .from('chama_cycles')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycle.id);

    // Cancel all pending STK requests
    await supabase
      .from('chama_stk_requests')
      .update({
        status: 'cancelled',
        error_message: 'Collection stopped by admin',
        updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycle.id)
      .in('status', ['pending', 'sent', 'processing']);

    console.log('🛑 Collection stopped:', { chama_id, cycle_id: cycle.id });

    return NextResponse.json({
      success: true,
      message: 'Collection stopped successfully',
      cycle_id: cycle.id,
    });

  } catch (error: any) {
    console.error('❌ Stop collection error:', error);
    return NextResponse.json({ error: 'Failed to stop collection', details: error.message }, { status: 500 });
  }
}

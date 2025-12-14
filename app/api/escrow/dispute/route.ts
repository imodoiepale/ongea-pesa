import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrow_id, milestone_id, reason, description, evidence } = await request.json();

    if (!escrow_id || !reason) {
      return NextResponse.json({ error: 'Missing escrow_id or reason' }, { status: 400 });
    }

    // Get escrow details
    const { data: escrow, error: escrowError } = await supabase
      .from('escrows')
      .select('*')
      .eq('id', escrow_id)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    // Verify user is a participant
    const isParticipant = [escrow.buyer_id, escrow.seller_id, escrow.creator_id].includes(user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized to raise dispute' }, { status: 403 });
    }

    // Check escrow status allows disputes
    if (!['funded', 'in_progress', 'pending_release'].includes(escrow.status)) {
      return NextResponse.json({ error: `Cannot dispute: escrow status is ${escrow.status}` }, { status: 400 });
    }

    console.log('⚠️ Raising escrow dispute:', { escrow_id, reason });

    // Create dispute record
    const { data: dispute, error: disputeError } = await supabase
      .from('escrow_disputes')
      .insert({
        escrow_id,
        milestone_id: milestone_id || null,
        raised_by: user.id,
        reason,
        description: description || '',
        evidence: evidence || [],
        status: 'open',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (disputeError) {
      console.error('❌ Failed to create dispute:', disputeError);
      return NextResponse.json(
        { error: 'Failed to create dispute', details: disputeError.message },
        { status: 500 }
      );
    }

    // Update escrow status to disputed
    await supabase
      .from('escrows')
      .update({
        status: 'disputed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow_id);

    // Create hold transaction
    await supabase.from('escrow_transactions').insert({
      escrow_id,
      transaction_type: 'dispute_hold',
      amount: escrow.funded_amount - escrow.released_amount,
      status: 'completed',
      notes: `Funds held due to dispute: ${reason}`,
      created_at: new Date().toISOString(),
    });

    console.log('✅ Dispute raised:', dispute.id);

    return NextResponse.json({
      success: true,
      dispute_id: dispute.id,
      message: 'Dispute raised successfully. Funds are now held pending resolution.',
    });

  } catch (error: any) {
    console.error('❌ Dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to raise dispute', details: error.message },
      { status: 500 }
    );
  }
}

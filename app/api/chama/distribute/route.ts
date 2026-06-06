import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Distribute Funds - Send collected funds to the rotating recipient
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cycle_id } = await request.json();

    if (!cycle_id) {
      return NextResponse.json({ error: 'Missing cycle_id' }, { status: 400 });
    }

    // Get cycle with chama details
    const { data: cycle, error: cycleError } = await supabase
      .from('chama_cycles')
      .select('*, chama:chamas(*), recipient:chama_members!recipient_member_id(*)')
      .eq('id', cycle_id)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Verify cycle is ready for distribution
    if (cycle.status !== 'collected') {
      return NextResponse.json({ 
        error: `Cannot distribute: cycle status is ${cycle.status}. Must be 'collected'.` 
      }, { status: 400 });
    }

    // Check if chama requires all payments before payout
    if (cycle.chama?.require_all_before_payout && cycle.collected_amount < cycle.expected_amount) {
      return NextResponse.json({ 
        error: 'Not all members have paid. Collection is incomplete.',
        collected: cycle.collected_amount,
        expected: cycle.expected_amount,
      }, { status: 400 });
    }

    const recipient = cycle.recipient;
    if (!recipient) {
      return NextResponse.json({ error: 'No recipient found for this cycle' }, { status: 400 });
    }

    console.log('💸 Distributing chama funds:', {
      cycle_id,
      amount: cycle.collected_amount,
      recipient: recipient.name,
      phone: recipient.phone_number,
    });

    // Update cycle status to distributing
    await supabase
      .from('chama_cycles')
      .update({ status: 'distributing' })
      .eq('id', cycle_id);

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('chama_payouts')
      .insert({
        chama_id: cycle.chama_id,
        cycle_id,
        member_id: recipient.id,
        amount: cycle.collected_amount,
        phone_number: recipient.phone_number,
        payment_method: 'mpesa',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payoutError) {
      console.error('❌ Failed to create payout record:', payoutError);
    }

    // Initiate REAL B2C payout via Safaricom Daraja (async — final status is
    // confirmed later by the /webhook/b2c_result callback, which flips this
    // payout to 'completed' or 'failed' by conversation_id).
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';
    if (payout) {
      try {
        const darajaRes = await fetch(`${n8nBase}/webhook/bulk_disburse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chamaId: cycle.chama_id,
            remarks: `${cycle.chama?.name || 'Chama'} payout`,
            disbursements: [
              {
                memberId: recipient.id,
                phone: recipient.phone_number,
                amount: cycle.collected_amount,
              },
            ],
          }),
        });
        const darajaJson: any = await darajaRes.json().catch(() => ({}));
        const conversationId =
          darajaJson?.conversationId ||
          darajaJson?.results?.[0]?.conversationId ||
          darajaJson?.ConversationID ||
          null;

        if (!darajaRes.ok) {
          throw new Error(darajaJson?.message || `Daraja responded ${darajaRes.status}`);
        }

        // Stay 'pending' until the async result callback reconciles it.
        await supabase
          .from('chama_payouts')
          .update({ conversation_id: conversationId, provider: 'safaricom_b2c', status: 'pending' })
          .eq('id', payout.id);
      } catch (darajaErr: any) {
        console.error('❌ Daraja B2C initiation failed:', darajaErr);
        await supabase.from('chama_payouts').update({ status: 'failed' }).eq('id', payout.id);
        await supabase.from('chama_cycles').update({ status: 'collected' }).eq('id', cycle_id);
        return NextResponse.json(
          { error: 'Failed to initiate payout', details: darajaErr.message },
          { status: 502 }
        );
      }
    }

    // Update cycle as completed
    await supabase
      .from('chama_cycles')
      .update({
        status: 'completed',
        distributed_amount: cycle.collected_amount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', cycle_id);

    // Update recipient member
    await supabase
      .from('chama_members')
      .update({
        has_received_payout: true,
        last_payout_date: new Date().toISOString(),
        total_received: (recipient.total_received || 0) + cycle.collected_amount,
      })
      .eq('id', recipient.id);

    // Update chama - increment cycle and rotation
    const newCycle = cycle.chama.current_cycle + 1;
    const memberCount = cycle.chama.members?.length || 1;
    const newRotationIndex = (cycle.chama.current_rotation_index + 1) % memberCount;

    // Calculate next collection date (skip for one-time collections)
    let nextCollectionDate: Date | null = null;
    const isOneTime = cycle.chama.collection_frequency === 'one-time';
    
    if (!isOneTime) {
      nextCollectionDate = new Date();
      switch (cycle.chama.collection_frequency) {
        case 'daily':
          nextCollectionDate.setDate(nextCollectionDate.getDate() + 1);
          break;
        case 'weekly':
          nextCollectionDate.setDate(nextCollectionDate.getDate() + 7);
          break;
        case 'biweekly':
          nextCollectionDate.setDate(nextCollectionDate.getDate() + 14);
          break;
        case 'monthly':
          nextCollectionDate.setMonth(nextCollectionDate.getMonth() + 1);
          break;
        case 'custom':
          nextCollectionDate.setDate(nextCollectionDate.getDate() + (cycle.chama.custom_frequency_days || 14));
          break;
      }
    }

    // Check if chama is complete (all cycles done or one-time collection finished)
    const chamaComplete = isOneTime || (cycle.chama.total_cycles && newCycle > cycle.chama.total_cycles);

    await supabase
      .from('chamas')
      .update({
        current_cycle: chamaComplete ? cycle.chama.current_cycle : newCycle,
        current_rotation_index: newRotationIndex,
        total_distributed: (cycle.chama.total_distributed || 0) + cycle.collected_amount,
        next_collection_date: chamaComplete || !nextCollectionDate ? null : nextCollectionDate.toISOString(),
        status: chamaComplete ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycle.chama_id);

    console.log('✅ Distribution completed:', {
      amount: cycle.collected_amount,
      recipient: recipient.name,
      next_cycle: chamaComplete ? 'Chama completed' : newCycle,
    });

    return NextResponse.json({
      success: true,
      message: `${cycle.chama.currency} ${cycle.collected_amount.toLocaleString()} payout to ${recipient.name} initiated (processing via M-Pesa)`,
      status: 'pending',
      payout_id: payout?.id,
      amount: cycle.collected_amount,
      recipient: {
        name: recipient.name,
        phone: recipient.phone_number,
      },
      chama_completed: chamaComplete,
      next_cycle: chamaComplete ? null : newCycle,
      next_collection_date: chamaComplete || !nextCollectionDate ? null : nextCollectionDate.toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Distribute error:', error);
    return NextResponse.json({ error: 'Failed to distribute funds', details: error.message }, { status: 500 });
  }
}

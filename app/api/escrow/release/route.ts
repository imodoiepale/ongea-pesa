import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrow_id, milestone_id } = await request.json();

    if (!escrow_id) {
      return NextResponse.json({ error: 'Missing escrow_id' }, { status: 400 });
    }

    // Get escrow details
    const { data: escrow, error: escrowError } = await supabase
      .from('escrows')
      .select('*, milestones:escrow_milestones(*)')
      .eq('id', escrow_id)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    // Verify user can release (buyer or has required signatures)
    const canRelease = escrow.buyer_id === user.id || escrow.creator_id === user.id;
    if (!canRelease) {
      return NextResponse.json({ error: 'Not authorized to release funds' }, { status: 403 });
    }

    // Check if escrow is funded
    if (escrow.status !== 'funded' && escrow.status !== 'in_progress') {
      return NextResponse.json({ error: `Cannot release: escrow status is ${escrow.status}` }, { status: 400 });
    }

    // Check time-lock
    if (escrow.lock_until && new Date(escrow.lock_until) > new Date()) {
      return NextResponse.json({ 
        error: `Funds are locked until ${new Date(escrow.lock_until).toLocaleString()}` 
      }, { status: 400 });
    }

    // Handle multi-signature requirement
    if (escrow.requires_multi_sig) {
      // Record this user's signature
      await supabase
        .from('escrow_participants')
        .update({ has_signed: true, signed_at: new Date().toISOString() })
        .eq('escrow_id', escrow_id)
        .eq('user_id', user.id);

      // Count signatures
      const { count } = await supabase
        .from('escrow_participants')
        .select('*', { count: 'exact', head: true })
        .eq('escrow_id', escrow_id)
        .eq('has_signed', true);

      const signatureCount = count || 0;

      // Update escrow signature count
      await supabase
        .from('escrows')
        .update({ collected_signatures: signatureCount })
        .eq('id', escrow_id);

      if (signatureCount < escrow.required_signatures) {
        return NextResponse.json({
          success: true,
          message: `Signature recorded. ${signatureCount}/${escrow.required_signatures} signatures collected.`,
          signatures_needed: escrow.required_signatures - signatureCount,
        });
      }
    }

    // Determine release amount
    let releaseAmount = escrow.funded_amount - escrow.released_amount;
    let milestoneToRelease = null;

    if (milestone_id && escrow.escrow_type === 'milestone') {
      milestoneToRelease = escrow.milestones?.find((m: any) => m.id === milestone_id);
      if (!milestoneToRelease) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
      }
      if (milestoneToRelease.status === 'released') {
        return NextResponse.json({ error: 'Milestone already released' }, { status: 400 });
      }
      releaseAmount = milestoneToRelease.amount;
    }

    // Get seller's phone for payout
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('mpesa_number, phone_number')
      .eq('id', escrow.seller_id)
      .single();

    const sellerPhone = sellerProfile?.mpesa_number || sellerProfile?.phone_number;

    if (!sellerPhone) {
      return NextResponse.json({ error: 'Seller phone number not found' }, { status: 400 });
    }

    console.log('💸 Releasing escrow funds:', { escrow_id, amount: releaseAmount, to: sellerPhone });

    // Calculate platform fee
    const feeAmount = releaseAmount * (escrow.fee_percentage / 100);
    const netAmount = releaseAmount - feeAmount;

    // Create release transaction
    const { data: releaseTx, error: releaseTxError } = await supabase
      .from('escrow_transactions')
      .insert({
        escrow_id,
        milestone_id: milestone_id || null,
        transaction_type: 'release',
        from_user_id: escrow.buyer_id,
        to_user_id: escrow.seller_id,
        amount: netAmount,
        status: 'pending',
        notes: `Release to seller. Fee: ${feeAmount}`,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Record fee transaction
    if (feeAmount > 0) {
      await supabase.from('escrow_transactions').insert({
        escrow_id,
        transaction_type: 'fee',
        amount: feeAmount,
        status: 'completed',
        notes: `Platform fee ${escrow.fee_percentage}%`,
        created_at: new Date().toISOString(),
      });
    }

    // TODO: Initiate actual payout via B2C or bank transfer
    // For now, mark as completed (in production, this would be async)

    // Update escrow
    const newReleasedAmount = escrow.released_amount + releaseAmount;
    const isFullyReleased = newReleasedAmount >= escrow.funded_amount;

    await supabase
      .from('escrows')
      .update({
        released_amount: newReleasedAmount,
        status: isFullyReleased ? 'completed' : 'in_progress',
        completed_at: isFullyReleased ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow_id);

    // Update milestone if applicable
    if (milestoneToRelease) {
      await supabase
        .from('escrow_milestones')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', milestone_id);
    }

    // Update transaction as completed
    if (releaseTx) {
      await supabase
        .from('escrow_transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', releaseTx.id);
    }

    console.log('✅ Escrow funds released:', { amount: netAmount, fee: feeAmount });

    return NextResponse.json({
      success: true,
      message: `Released ${escrow.currency} ${netAmount.toLocaleString()} to seller`,
      released_amount: netAmount,
      fee_amount: feeAmount,
      escrow_completed: isFullyReleased,
    });

  } catch (error: any) {
    console.error('❌ Release escrow error:', error);
    return NextResponse.json(
      { error: 'Failed to release escrow', details: error.message },
      { status: 500 }
    );
  }
}

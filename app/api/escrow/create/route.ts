import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEntityGateAndPocket } from '@/lib/services/gateService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      escrow_type,
      total_amount,
      currency = 'KES',
      buyer_phone,
      seller_phone,
      arbitrator_phone,
      requires_multi_sig,
      required_signatures,
      lock_until,
      auto_release_at,
      milestones,
      release_conditions,
    } = body;

    if (!title || !total_amount || !escrow_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, total_amount, escrow_type' },
        { status: 400 }
      );
    }

    console.log('🔒 Creating escrow:', { title, total_amount, escrow_type });

    // Find users by phone numbers
    let buyerId = null;
    let sellerId = null;
    let arbitratorId = null;

    if (buyer_phone) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${buyer_phone},mpesa_number.eq.${buyer_phone}`)
        .single();
      buyerId = buyerProfile?.id;
    }

    if (seller_phone) {
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${seller_phone},mpesa_number.eq.${seller_phone}`)
        .single();
      sellerId = sellerProfile?.id;
    }

    if (arbitrator_phone) {
      const { data: arbitratorProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${arbitrator_phone},mpesa_number.eq.${arbitrator_phone}`)
        .single();
      arbitratorId = arbitratorProfile?.id;
    }

    // Create escrow
    const { data: escrow, error: escrowError } = await supabase
      .from('escrows')
      .insert({
        title,
        description,
        escrow_type,
        creator_id: user.id,
        buyer_id: buyerId || user.id, // Default creator as buyer if not specified
        seller_id: sellerId,
        arbitrator_id: arbitratorId,
        total_amount: parseFloat(total_amount),
        currency,
        requires_multi_sig: requires_multi_sig || false,
        required_signatures: required_signatures || (requires_multi_sig ? 2 : 1),
        lock_until,
        auto_release_at,
        release_conditions: release_conditions || [],
        status: 'pending_funding',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (escrowError) {
      console.error('❌ Failed to create escrow:', escrowError);
      return NextResponse.json(
        { error: 'Failed to create escrow', details: escrowError.message },
        { status: 500 }
      );
    }

    // Create Gate and Pocket for this escrow
    console.log('🔐 Creating gate and pocket for escrow:', escrow.id);
    const gateResult = await createEntityGateAndPocket(
      'escrow',
      escrow.id,
      title,
      description || `Escrow: ${title}`
    );

    if (gateResult.success) {
      // Update escrow with gate and pocket info
      await supabase
        .from('escrows')
        .update({
          gate_id: gateResult.gate_id,
          gate_name: gateResult.gate_name,
          pocket_id: gateResult.pocket_id,
          pocket_name: gateResult.pocket_name,
        })
        .eq('id', escrow.id);
      
      console.log('✅ Gate created:', gateResult.gate_name);
    } else {
      console.warn('⚠️ Failed to create gate:', gateResult.error);
      // Continue without gate - can be retried later
    }

    // Add participants
    const participants = [];
    
    if (buyerId || buyer_phone) {
      participants.push({
        escrow_id: escrow.id,
        user_id: buyerId,
        role: 'buyer',
        phone_number: buyer_phone,
        signature_required: requires_multi_sig,
        status: buyerId ? 'accepted' : 'pending',
      });
    }

    if (sellerId || seller_phone) {
      participants.push({
        escrow_id: escrow.id,
        user_id: sellerId,
        role: 'seller',
        phone_number: seller_phone,
        signature_required: requires_multi_sig,
        status: sellerId ? 'accepted' : 'pending',
      });
    }

    if (arbitratorId || arbitrator_phone) {
      participants.push({
        escrow_id: escrow.id,
        user_id: arbitratorId,
        role: 'arbitrator',
        phone_number: arbitrator_phone,
        signature_required: false,
        status: arbitratorId ? 'accepted' : 'pending',
      });
    }

    if (participants.length > 0) {
      await supabase.from('escrow_participants').insert(participants);
    }

    // Create milestones if provided
    if (milestones && milestones.length > 0 && escrow_type === 'milestone') {
      const milestonesData = milestones.map((m: any, index: number) => ({
        escrow_id: escrow.id,
        title: m.title,
        description: m.description,
        sequence_order: index + 1,
        amount: parseFloat(m.amount),
        status: 'pending',
      }));

      await supabase.from('escrow_milestones').insert(milestonesData);
    }

    console.log('✅ Escrow created:', escrow.id);

    return NextResponse.json({
      success: true,
      escrow,
      message: 'Escrow created successfully',
    });

  } catch (error: any) {
    console.error('❌ Create escrow error:', error);
    return NextResponse.json(
      { error: 'Failed to create escrow', details: error.message },
      { status: 500 }
    );
  }
}

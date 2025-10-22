import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { mpesa_transaction_id, external_ref } = body;

    console.log('💳 Completing transaction:', id);

    // Update transaction to completed
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        mpesa_transaction_id: mpesa_transaction_id || '',
        external_ref: external_ref || '',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Security: only update own transactions
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to complete transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete transaction', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Transaction completed:', transaction.id);
    console.log('🔔 Trigger will update wallet balance automatically');

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error: any) {
    console.error('Transaction completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete transaction', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, error_message, mpesa_transaction_id, external_ref } = body;

    console.log(`📝 Updating transaction ${id} to status: ${status}`);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (mpesa_transaction_id) updateData.mpesa_transaction_id = mpesa_transaction_id;
      if (external_ref) updateData.external_ref = external_ref;
    }

    if (status === 'failed' && error_message) {
      updateData.error_message = error_message;
    }

    // Update transaction
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Transaction updated to ${status}:`, transaction.id);

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error: any) {
    console.error('Transaction update error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error.message },
      { status: 500 }
    );
  }
}

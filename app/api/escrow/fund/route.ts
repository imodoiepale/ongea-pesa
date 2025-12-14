import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrow_id, amount, phone } = await request.json();

    if (!escrow_id || !amount) {
      return NextResponse.json({ error: 'Missing escrow_id or amount' }, { status: 400 });
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

    // Verify user is the buyer
    if (escrow.buyer_id !== user.id && escrow.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can fund this escrow' }, { status: 403 });
    }

    // Check if already fully funded
    if (escrow.funded_amount >= escrow.total_amount) {
      return NextResponse.json({ error: 'Escrow is already fully funded' }, { status: 400 });
    }

    const fundAmount = Math.min(parseFloat(amount), escrow.total_amount - escrow.funded_amount);

    console.log('💰 Funding escrow:', { escrow_id, amount: fundAmount });

    // Get user's phone for STK push
    const { data: profile } = await supabase
      .from('profiles')
      .select('mpesa_number, phone_number, gate_name')
      .eq('id', user.id)
      .single();

    const userPhone = phone || profile?.mpesa_number || profile?.phone_number;

    if (!userPhone) {
      return NextResponse.json({ error: 'No phone number found for STK push' }, { status: 400 });
    }

    // Create escrow transaction record
    const { data: txRecord, error: txError } = await supabase
      .from('escrow_transactions')
      .insert({
        escrow_id,
        transaction_type: 'funding',
        from_user_id: user.id,
        amount: fundAmount,
        payment_method: 'mpesa',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error('❌ Failed to create transaction record:', txError);
    }

    // Initiate STK push via gate deposit
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '1');
    formData.append('transaction_intent', 'Deposit');
    formData.append('phone', userPhone.replace(/\s/g, ''));
    formData.append('amount', fundAmount.toString());
    formData.append('currency', 'KES');
    formData.append('gate_name', profile?.gate_name || 'ongeapesa');
    formData.append('pocket_name', `escrow_${escrow_id}`);
    formData.append('payment_mode', 'MPESA');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const depositResponse = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const depositData = await depositResponse.json();
      console.log('📦 STK response:', depositData);

      // Parse response
      let accountNumber = '';
      let trxId = '';
      if (depositData.mpesapayment && Array.isArray(depositData.mpesapayment)) {
        for (const item of depositData.mpesapayment) {
          if (item.trx_id) trxId = item.trx_id;
          if (item.account_number) accountNumber = item.account_number;
        }
      }

      // Update transaction with STK details
      if (txRecord) {
        await supabase
          .from('escrow_transactions')
          .update({
            stk_checkout_id: accountNumber || trxId,
            external_ref: accountNumber,
            status: 'processing',
          })
          .eq('id', txRecord.id);
      }

      return NextResponse.json({
        success: true,
        message: 'STK push sent. Enter your M-Pesa PIN to fund the escrow.',
        transaction_id: txRecord?.id,
        stk_reference: accountNumber || trxId,
        amount: fundAmount,
      });

    } catch (fetchError: any) {
      console.error('❌ STK push failed:', fetchError);
      
      // Update transaction as failed
      if (txRecord) {
        await supabase
          .from('escrow_transactions')
          .update({ status: 'failed', notes: fetchError.message })
          .eq('id', txRecord.id);
      }

      return NextResponse.json(
        { error: 'Failed to initiate payment', details: fetchError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Fund escrow error:', error);
    return NextResponse.json(
      { error: 'Failed to fund escrow', details: error.message },
      { status: 500 }
    );
  }
}

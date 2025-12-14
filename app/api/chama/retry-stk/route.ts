import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Retry STK - Send follow-up STK push for a member who failed to pay
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cycle_id, member_id } = await request.json();

    if (!cycle_id || !member_id) {
      return NextResponse.json({ error: 'Missing cycle_id or member_id' }, { status: 400 });
    }

    // Get existing STK request
    const { data: stkRequest, error: stkError } = await supabase
      .from('chama_stk_requests')
      .select('*, cycle:chama_cycles(*), member:chama_members(*)')
      .eq('cycle_id', cycle_id)
      .eq('member_id', member_id)
      .single();

    if (stkError || !stkRequest) {
      return NextResponse.json({ error: 'STK request not found' }, { status: 404 });
    }

    if (stkRequest.status === 'completed') {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
    }

    if (stkRequest.attempt_count >= stkRequest.max_attempts) {
      return NextResponse.json({ error: 'Maximum retry attempts reached' }, { status: 400 });
    }

    console.log(`🔄 Retrying STK for ${stkRequest.member?.name} (attempt ${stkRequest.attempt_count + 1})`);

    // Send new STK push
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '1');
    formData.append('transaction_intent', 'Deposit');
    formData.append('phone', stkRequest.phone_number.replace(/\s/g, ''));
    formData.append('amount', stkRequest.amount.toString());
    formData.append('currency', 'KES');
    formData.append('gate_name', 'ongeapesa');
    formData.append('pocket_name', `chama_${stkRequest.cycle?.chama_id}`);
    formData.append('payment_mode', 'MPESA');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      let accountNumber = '';
      let trxId = '';
      let success = false;

      if (data.mpesapayment && Array.isArray(data.mpesapayment)) {
        for (const item of data.mpesapayment) {
          if (item.bool_code?.toUpperCase() === 'TRUE') success = true;
          if (item.trx_id) trxId = item.trx_id;
          if (item.account_number) accountNumber = item.account_number;
        }
      }

      // Update STK request
      await supabase
        .from('chama_stk_requests')
        .update({
          status: success ? 'sent' : 'failed',
          checkout_request_id: trxId || stkRequest.checkout_request_id,
          account_number: accountNumber || stkRequest.account_number,
          attempt_count: stkRequest.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
          next_retry_at: null,
          error_message: success ? null : 'Retry STK push failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stkRequest.id);

      return NextResponse.json({
        success,
        message: success ? 'STK push sent successfully' : 'STK push failed',
        attempt: stkRequest.attempt_count + 1,
        max_attempts: stkRequest.max_attempts,
        account_number: accountNumber,
      });

    } catch (fetchError: any) {
      console.error('❌ Retry STK failed:', fetchError);

      await supabase
        .from('chama_stk_requests')
        .update({
          status: 'failed',
          attempt_count: stkRequest.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
          error_message: fetchError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stkRequest.id);

      return NextResponse.json({ error: 'Failed to send STK', details: fetchError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Retry STK error:', error);
    return NextResponse.json({ error: 'Failed to retry STK', details: error.message }, { status: 500 });
  }
}

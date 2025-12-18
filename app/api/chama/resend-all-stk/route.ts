import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Resend All STK - Bulk resend STK pushes to all non-completed members in active cycle
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
      return NextResponse.json({ error: 'Only admin can resend STKs' }, { status: 403 });
    }

    // Find active cycle or use provided cycle_id
    let cycleQuery = supabase
      .from('chama_cycles')
      .select('*')
      .eq('chama_id', chama_id);

    if (cycle_id) {
      cycleQuery = cycleQuery.eq('id', cycle_id);
    } else {
      cycleQuery = cycleQuery.in('status', ['collecting', 'collected']);
    }

    const { data: cycle, error: cycleError } = await cycleQuery.single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'No active collection cycle found' }, { status: 404 });
    }

    // Get all non-completed STK requests
    const { data: pendingStks, error: stkError } = await supabase
      .from('chama_stk_requests')
      .select('*, member:chama_members(*)')
      .eq('cycle_id', cycle.id)
      .in('status', ['pending', 'sent', 'failed', 'cancelled', 'expired']);

    if (stkError) {
      return NextResponse.json({ error: 'Failed to fetch STK requests' }, { status: 500 });
    }

    if (!pendingStks || pendingStks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending STK requests to resend',
        resent: 0 
      });
    }

    console.log(`📱 Resending STK to ${pendingStks.length} members simultaneously...`);

    // Send all STK pushes in parallel using Promise.all
    const stkPromises = pendingStks.map(async (stkRequest) => {
      try {
        const formData = new FormData();
        formData.append('user_email', 'info@nsait.co.ke');
        formData.append('request', '1');
        formData.append('transaction_intent', 'Deposit');
        formData.append('phone', stkRequest.phone_number.replace(/\s/g, ''));
        formData.append('amount', stkRequest.amount.toString());
        formData.append('currency', 'KES');
        formData.append('gate_name', 'ongeapesa');
        formData.append('pocket_name', `chama_${chama_id}`);
        formData.append('payment_mode', 'MPESA');

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

        // Update STK record
        await supabase
          .from('chama_stk_requests')
          .update({
            status: success ? 'sent' : 'failed',
            checkout_request_id: trxId || stkRequest.checkout_request_id,
            account_number: accountNumber || stkRequest.account_number,
            attempt_count: (stkRequest.attempt_count || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            error_message: success ? null : 'Resend STK push failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', stkRequest.id);

        return {
          member_id: stkRequest.member_id,
          member_name: stkRequest.member?.name,
          phone: stkRequest.phone_number,
          success,
          stk_id: stkRequest.id,
        };

      } catch (stkError: any) {
        console.error(`❌ STK failed for ${stkRequest.member?.name}:`, stkError.message);
        
        await supabase
          .from('chama_stk_requests')
          .update({
            status: 'failed',
            attempt_count: (stkRequest.attempt_count || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            error_message: stkError.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stkRequest.id);

        return {
          member_id: stkRequest.member_id,
          member_name: stkRequest.member?.name,
          phone: stkRequest.phone_number,
          success: false,
          error: stkError.message,
        };
      }
    });

    // Wait for all STK pushes to complete
    const stkResults = await Promise.all(stkPromises);
    const successCount = stkResults.filter(r => r.success).length;
    const failedCount = stkResults.filter(r => !r.success).length;

    // Update cycle status back to collecting if it was something else
    await supabase
      .from('chama_cycles')
      .update({
        status: 'collecting',
        members_pending: successCount,
        members_failed: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycle.id);

    console.log('✅ STKs resent:', { cycle_id: cycle.id, sent: successCount, failed: failedCount });

    return NextResponse.json({
      success: true,
      cycle_id: cycle.id,
      message: `STK resent to ${successCount} members`,
      resent: pendingStks.length,
      stk_sent: successCount,
      stk_failed: failedCount,
      results: stkResults,
    });

  } catch (error: any) {
    console.error('❌ Resend all STK error:', error);
    return NextResponse.json({ error: 'Failed to resend STKs', details: error.message }, { status: 500 });
  }
}

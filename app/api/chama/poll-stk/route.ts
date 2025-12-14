import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Poll STK Status - Check status of all pending STK requests for a cycle
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cycle_id = searchParams.get('cycle_id');

    if (!cycle_id) {
      return NextResponse.json({ error: 'Missing cycle_id' }, { status: 400 });
    }

    // Get cycle with STK requests
    const { data: cycle, error: cycleError } = await supabase
      .from('chama_cycles')
      .select('*, chama:chamas(*), stk_requests:chama_stk_requests(*)')
      .eq('id', cycle_id)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Get settlements from IndexPay to check payment status
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('date_from', yesterday.toISOString().split('T')[0]);
    formData.append('date_to', today.toISOString().split('T')[0]);

    let settlements: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://aps.co.ke/indexpay/api/get_settlements.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.settlements && Array.isArray(data.settlements)) {
        settlements = data.settlements;
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
    }

    // Update STK request statuses based on settlements
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let totalCollected = 0;

    for (const stkRequest of (cycle.stk_requests || [])) {
      if (stkRequest.status === 'completed') {
        completedCount++;
        totalCollected += stkRequest.amount;
        continue;
      }

      // Check if this STK was completed
      const matchingSettlement = settlements.find((s: any) => 
        s.account_number === stkRequest.account_number ||
        s.phone?.includes(stkRequest.phone_number.slice(-9))
      );

      if (matchingSettlement) {
        // Payment found - update as completed
        await supabase
          .from('chama_stk_requests')
          .update({
            status: 'completed',
            mpesa_receipt_number: matchingSettlement.mpesa_code || matchingSettlement.receipt_number,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', stkRequest.id);

        completedCount++;
        totalCollected += stkRequest.amount;

        // Update member's contribution total
        await supabase
          .from('chama_members')
          .update({
            total_contributed: (stkRequest.member?.total_contributed || 0) + stkRequest.amount,
          })
          .eq('id', stkRequest.member_id);

      } else if (stkRequest.status === 'failed' || stkRequest.status === 'expired') {
        failedCount++;
      } else {
        pendingCount++;
      }
    }

    // Update cycle totals
    await supabase
      .from('chama_cycles')
      .update({
        members_paid: completedCount,
        members_pending: pendingCount,
        members_failed: failedCount,
        collected_amount: totalCollected,
        status: completedCount === cycle.stk_requests?.length ? 'collected' : 'collecting',
      })
      .eq('id', cycle_id);

    // Update chama totals
    if (totalCollected > 0) {
      await supabase
        .from('chamas')
        .update({
          total_collected: (cycle.chama?.total_collected || 0) + totalCollected,
        })
        .eq('id', cycle.chama_id);
    }

    const allCompleted = completedCount === cycle.stk_requests?.length;
    const allFailed = failedCount === cycle.stk_requests?.length;

    return NextResponse.json({
      success: true,
      cycle_id,
      total_members: cycle.stk_requests?.length || 0,
      completed: completedCount,
      pending: pendingCount,
      failed: failedCount,
      collected_amount: totalCollected,
      expected_amount: cycle.expected_amount,
      all_completed: allCompleted,
      all_failed: allFailed,
      status: allCompleted ? 'collected' : 'collecting',
    });

  } catch (error: any) {
    console.error('❌ Poll STK error:', error);
    return NextResponse.json({ error: 'Failed to poll STK status', details: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Poll Pending STK Requests - Check and update ALL pending STK requests
 * Similar to /api/gate/poll-pending for deposits
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get optional chama_id filter from body
    let chamaId: string | null = null;
    try {
      const body = await request.json();
      chamaId = body.chama_id || null;
    } catch { }

    // Get all pending STK requests
    let query = supabase
      .from('chama_stk_requests')
      .select('*, member:chama_members(*), chama:chamas(*)')
      .in('status', ['pending', 'processing', 'sent'])
      .order('created_at', { ascending: false });

    if (chamaId) {
      query = query.eq('chama_id', chamaId);
    }

    const { data: pendingRequests, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch pending STK requests:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending STK requests',
        completed: 0,
        failed: 0,
        still_pending: 0,
        stk_requests: [],
      });
    }

    console.log(`🔄 Polling ${pendingRequests.length} pending STK requests...`);

    // Get settlements from IndexPay
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('date_from', yesterday.toISOString().split('T')[0]);
    formData.append('date_to', today.toISOString().split('T')[0]);

    // Fetch settlements - parse like deposit poll-pending does
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
      
      // Parse settlements response - handle different formats like deposit polling
      if (Array.isArray(data) && data.length > 0) {
        // Format: [{ "transactions": [...], ... }]
        const firstItem = data[0];
        if (firstItem.transactions && Array.isArray(firstItem.transactions)) {
          settlements = firstItem.transactions;
        }
      } else if (data.transactions && Array.isArray(data.transactions)) {
        settlements = data.transactions;
      } else if (data.settlements && Array.isArray(data.settlements)) {
        settlements = data.settlements;
      }
      
      console.log(`📥 Got ${settlements.length} settlements from IndexPay`);
      if (settlements.length > 0) {
        console.log(`   Sample: trx_ID=${settlements[0].trx_ID}, Status=${settlements[0].Status}, Gate=${settlements[0].Gate}`);
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
    }

    let completedCount = 0;
    let failedCount = 0;
    let stillPendingCount = 0;
    const updatedRequests: any[] = [];

    for (const stkRequest of pendingRequests) {
      const gateName = stkRequest.chama?.gate_name || stkRequest.gate_name;
      const transactionRef = stkRequest.account_number || stkRequest.checkout_request_id;
      
      console.log(`\n🔍 Checking STK ${stkRequest.id}`);
      console.log(`   Phone: ${stkRequest.phone_number}, Account#: ${stkRequest.account_number}, Gate: ${gateName}`);
      
      // Match by trx_ID/account_number - same logic as deposit polling
      let matchingSettlement = settlements.find((s: any) => {
        // Match by transaction ID (account_number is the trx_id from STK push)
        const trxMatch = transactionRef && (
          s.trx_ID === transactionRef || 
          s.trx_id === transactionRef || 
          s.TransactionID === transactionRef ||
          s.account_number === transactionRef
        );
        
        // Also match by phone number as fallback
        const phoneMatch = stkRequest.phone_number && s.phone?.includes(stkRequest.phone_number.slice(-9));
        
        // Gate match (if available)
        const gateMatch = !gateName || s.Gate === gateName || s.gate === gateName;
        
        return (trxMatch || phoneMatch) && gateMatch;
      });

      // Log settlements for this gate for debugging
      if (gateName) {
        const gateSettlements = settlements.filter((s: any) => s.Gate === gateName || s.gate === gateName);
        if (gateSettlements.length > 0) {
          console.log(`   📋 Found ${gateSettlements.length} settlements for gate ${gateName}:`);
          gateSettlements.slice(0, 3).forEach((s: any, i: number) => {
            console.log(`      [${i + 1}] trx_ID: ${s.trx_ID || s.trx_id}, Status: ${s.Status || s.status}, Phone: ${s.phone}`);
          });
        }
      }

      if (matchingSettlement) {
        const txStatus = (matchingSettlement.Status || matchingSettlement.status || '').toLowerCase();
        
        if (txStatus === 'success' || txStatus === 'completed') {
          // Payment found - update as completed
          console.log(`   ✅ Found completed payment: ${matchingSettlement.mpesa_code || matchingSettlement.receipt_number}`);
          
          const { error: updateError } = await supabase
            .from('chama_stk_requests')
            .update({
              status: 'completed',
              mpesa_receipt_number: matchingSettlement.mpesa_code || matchingSettlement.receipt_number || matchingSettlement.MpesaReceiptNumber,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', stkRequest.id);

          if (!updateError) {
            completedCount++;
            
            // Update member's contribution total
            if (stkRequest.member_id) {
              await supabase
                .from('chama_members')
                .update({
                  total_contributed: (stkRequest.member?.total_contributed || 0) + stkRequest.amount,
                })
                .eq('id', stkRequest.member_id);
            }

            // Update chama totals
            if (stkRequest.chama_id) {
              const currentTotal = stkRequest.chama?.total_collected || 0;
              await supabase
                .from('chamas')
                .update({
                  total_collected: currentTotal + stkRequest.amount,
                })
                .eq('id', stkRequest.chama_id);
            }

            updatedRequests.push({
              ...stkRequest,
              status: 'completed',
              mpesa_receipt_number: matchingSettlement.mpesa_code || matchingSettlement.receipt_number,
            });
            continue;
          }
        } else if (txStatus === 'failed' || txStatus === 'cancelled') {
          // Mark as failed
          console.log(`   ❌ Transaction failed/cancelled: ${txStatus}`);
          await supabase
            .from('chama_stk_requests')
            .update({
              status: 'failed',
              error_message: `Transaction ${txStatus}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stkRequest.id);

          failedCount++;
          updatedRequests.push({ ...stkRequest, status: 'failed', error_message: `Transaction ${txStatus}` });
          continue;
        }
      }
      
      // No match in settlements - try direct status check like deposit polling
      if (gateName && transactionRef) {
        try {
          console.log(`   🔄 Trying direct status check...`);
          const statusFormData = new FormData();
          statusFormData.append('user_email', 'info@nsait.co.ke');
          statusFormData.append('request', '1');
          statusFormData.append('transaction_intent', 'Check_Status');
          statusFormData.append('gate_name', gateName);
          statusFormData.append('transaction_id', transactionRef);

          const statusResponse = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
            method: 'POST',
            body: statusFormData,
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const status = (statusData.status || statusData.Status || '').toLowerCase();
            console.log(`   📊 Status check result: ${status}`);

            if (status === 'success' || status === 'completed') {
              const { error: updateError } = await supabase
                .from('chama_stk_requests')
                .update({
                  status: 'completed',
                  mpesa_receipt_number: statusData.mpesa_code || statusData.MpesaReceiptNumber || '',
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', stkRequest.id);

              if (!updateError) {
                console.log('   ✅ Marked as completed (via status check)');
                completedCount++;
                
                if (stkRequest.member_id) {
                  await supabase.from('chama_members').update({
                    total_contributed: (stkRequest.member?.total_contributed || 0) + stkRequest.amount,
                  }).eq('id', stkRequest.member_id);
                }
                if (stkRequest.chama_id) {
                  await supabase.from('chamas').update({
                    total_collected: (stkRequest.chama?.total_collected || 0) + stkRequest.amount,
                  }).eq('id', stkRequest.chama_id);
                }
                
                updatedRequests.push({ ...stkRequest, status: 'completed' });
                continue;
              }
            } else if (status === 'failed' || status === 'cancelled') {
              await supabase.from('chama_stk_requests').update({
                status: 'failed',
                error_message: statusData.message || `Transaction ${status}`,
                updated_at: new Date().toISOString(),
              }).eq('id', stkRequest.id);

              failedCount++;
              updatedRequests.push({ ...stkRequest, status: 'failed' });
              continue;
            }
          }
        } catch (statusError) {
          console.error('   ⚠️ Status check error:', statusError);
        }
      }

      // Still pending - check if expired
      const createdAt = new Date(stkRequest.created_at);
      const now = new Date();
      const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (ageMinutes > 2 && stkRequest.status === 'sent') {
        // Mark as failed/expired
        console.log(`   ⏱️ STK expired (${Math.round(ageMinutes)} min old)`);
        await supabase
          .from('chama_stk_requests')
          .update({
            status: 'failed',
            error_message: 'STK prompt expired - user did not respond',
            updated_at: new Date().toISOString(),
          })
          .eq('id', stkRequest.id);

        failedCount++;
        updatedRequests.push({ ...stkRequest, status: 'failed', error_message: 'STK prompt expired' });
      } else {
        console.log(`   ⏳ Still pending`);
        stillPendingCount++;
        updatedRequests.push(stkRequest);
      }
    }

    console.log(`📊 Poll results: ${completedCount} completed, ${failedCount} failed, ${stillPendingCount} still pending`);

    return NextResponse.json({
      success: true,
      completed: completedCount,
      failed: failedCount,
      still_pending: stillPendingCount,
      total_checked: pendingRequests.length,
      stk_requests: updatedRequests,
    });

  } catch (error: any) {
    console.error('❌ Poll pending STK error:', error);
    return NextResponse.json({ error: 'Failed to poll pending STK', details: error.message }, { status: 500 });
  }
}

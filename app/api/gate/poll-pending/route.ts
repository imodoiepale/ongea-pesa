import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Poll Pending Transactions
 * Checks all pending deposit transactions and updates their status
 * Can be called manually or via cron job
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Optional: Check for API key for cron jobs (skip auth for automated calls)
    const apiKey = request.headers.get('x-api-key');
    const isCronJob = apiKey === process.env.CRON_API_KEY;
    
    // If not a cron job, require authentication
    if (!isCronJob) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('🔄 POLLING PENDING TRANSACTIONS');
    console.log('='.repeat(60));
    console.log('⏰ Started at:', new Date().toISOString());

    // Get all pending deposit transactions from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log('📅 Looking for transactions since:', sevenDaysAgo.toISOString());

    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, phone, external_ref, metadata, created_at, status, type')
      .eq('status', 'pending')
      .eq('type', 'deposit')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch pending transactions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending transactions' },
        { status: 500 }
      );
    }

    console.log(`📋 Found ${pendingTransactions?.length || 0} pending deposit transactions`);
    
    // Debug: Also check for ALL pending transactions regardless of type
    const { data: allPending } = await supabase
      .from('transactions')
      .select('id, type, status, amount, created_at')
      .eq('status', 'pending')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (allPending && allPending.length > 0) {
      console.log(`🔍 DEBUG: All pending transactions (any type): ${allPending.length}`);
      allPending.forEach((tx, i) => {
        console.log(`   [${i + 1}] ID: ${tx.id}, Type: ${tx.type}, Status: ${tx.status}, Amount: ${tx.amount}, Created: ${tx.created_at}`);
      });
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending transactions to process',
        processed: 0,
        completed: 0,
        failed: 0,
        still_pending: 0,
        duration_ms: Date.now() - startTime
      });
    }

    // Get settlements from IndexPay for today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('date_from', yesterday.toISOString().split('T')[0]);
    formData.append('date_to', tomorrow.toISOString().split('T')[0]);

    let settlements: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const settlementsResponse = await fetch('https://aps.co.ke/indexpay/api/get_settlements.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (settlementsResponse.ok) {
        const settlementsData = await settlementsResponse.json();
        if (Array.isArray(settlementsData) && settlementsData.length > 0) {
          settlements = settlementsData[0]?.transactions || [];
        } else if (settlementsData?.transactions) {
          settlements = settlementsData.transactions;
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch settlements:', err);
    }

    console.log(`📊 Fetched ${settlements.length} settlements from IndexPay`);

    // Process each pending transaction
    const results = {
      processed: 0,
      completed: 0,
      failed: 0,
      still_pending: 0,
      errors: [] as string[],
    };

    for (const tx of pendingTransactions) {
      results.processed++;
      const gateName = tx.metadata?.gate_name;
      const transactionRef = tx.external_ref || tx.metadata?.account_number;

      console.log(`\n🔍 Processing transaction ${tx.id}`);
      console.log(`   Gate: ${gateName}, Ref: ${transactionRef}`);

      if (!gateName) {
        console.log('   ⚠️ No gate name, skipping');
        results.still_pending++;
        continue;
      }

      // Find matching settlement
      const matchedSettlement = settlements.find((s: any) => 
        (s.Gate === gateName || s.gate === gateName) &&
        (s.trx_ID === transactionRef || s.trx_id === transactionRef || s.TransactionID === transactionRef)
      );

      // Log all settlements for this gate for debugging
      const gateSettlements = settlements.filter((s: any) => s.Gate === gateName || s.gate === gateName);
      if (gateSettlements.length > 0) {
        console.log(`   📋 Found ${gateSettlements.length} settlements for gate ${gateName}:`);
        gateSettlements.forEach((s: any, i: number) => {
          console.log(`      [${i + 1}] trx_ID: ${s.trx_ID || s.trx_id}, Status: ${s.Status || s.status}, Amount: ${s.Amount || s.amount}`);
        });
      }

      if (!matchedSettlement) {
        // No match found, check if transaction is too old (> 30 minutes)
        const txAge = Date.now() - new Date(tx.created_at).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        if (txAge > thirtyMinutes) {
          // Mark as failed if too old and no settlement found
          console.log(`   ⏱️ Transaction is ${Math.round(txAge / 60000)} minutes old with no settlement`);
          
          // Check one more time via direct status check
          try {
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

              if (status === 'success' || status === 'completed') {
                // Update to completed
                const { error: updateError } = await supabase
                  .from('transactions')
                  .update({
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                    metadata: { ...tx.metadata, settlement_data: statusData, polled_at: new Date().toISOString() }
                  })
                  .eq('id', tx.id)
                  .neq('status', 'completed');

                if (!updateError) {
                  console.log('   ✅ Marked as completed (via status check)');
                  results.completed++;
                  continue;
                }
              } else if (status === 'failed' || status === 'cancelled') {
                // Update to failed
                await supabase
                  .from('transactions')
                  .update({
                    status: 'failed',
                    updated_at: new Date().toISOString(),
                    error_message: 'Transaction timed out or was cancelled',
                    metadata: { ...tx.metadata, status_data: statusData, polled_at: new Date().toISOString() }
                  })
                  .eq('id', tx.id)
                  .neq('status', 'completed');

                console.log('   ❌ Marked as failed (via status check)');
                results.failed++;
                continue;
              }
            }
          } catch (err) {
            console.warn('   ⚠️ Status check failed:', err);
          }

          // If still no resolution after 2 hours, mark as failed
          const twoHours = 2 * 60 * 60 * 1000;
          if (txAge > twoHours) {
            await supabase
              .from('transactions')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
                error_message: 'Transaction expired - no confirmation received within 2 hours',
                metadata: { ...tx.metadata, expired_at: new Date().toISOString() }
              })
              .eq('id', tx.id)
              .neq('status', 'completed');

            console.log('   ❌ Marked as failed (expired after 2 hours)');
            results.failed++;
            continue;
          }
        }

        console.log('   ⏳ Still pending, no settlement found yet');
        results.still_pending++;
        continue;
      }

      // Found matching settlement - check status
      const settlementStatus = (matchedSettlement.Status || matchedSettlement.status || '').toLowerCase();
      console.log(`   🎯 MATCHED SETTLEMENT FOUND:`);
      console.log(`      Transaction ID: ${tx.id}`);
      console.log(`      Settlement trx_ID: ${matchedSettlement.trx_ID || matchedSettlement.trx_id}`);
      console.log(`      Status: ${settlementStatus}`);
      console.log(`      Amount: ${matchedSettlement.Amount || matchedSettlement.amount}`);
      console.log(`      M-Pesa Receipt: ${matchedSettlement.MpesaReceiptNumber || matchedSettlement.mpesa_receipt || 'N/A'}`);
      console.log(`      Full settlement data:`, JSON.stringify(matchedSettlement, null, 2));

      if (settlementStatus === 'success' || settlementStatus === 'completed') {
        // Update to completed - DB trigger will credit balance
        console.log(`   🔄 Updating transaction ${tx.id} to COMPLETED...`);
        const { data: updatedTx, error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'completed',
            mpesa_transaction_id: matchedSettlement.MpesaReceiptNumber || matchedSettlement.mpesa_receipt,
            updated_at: new Date().toISOString(),
            metadata: { ...tx.metadata, settlement_data: matchedSettlement, polled_at: new Date().toISOString() }
          })
          .eq('id', tx.id)
          .neq('status', 'completed') // Prevent double-crediting
          .select()
          .single();

        if (updateError) {
          console.log('   ⚠️ Update skipped (likely already completed):', updateError.message);
        } else {
          console.log(`   ✅ SUCCESS: Transaction ${tx.id} marked as COMPLETED`);
          console.log(`   💰 DB trigger will now credit wallet balance with ${tx.amount}`);
        }
        results.completed++;

      } else if (settlementStatus === 'failed' || settlementStatus === 'cancelled' || settlementStatus === 'canceled') {
        // Update to failed
        console.log(`   🔄 Updating transaction ${tx.id} to FAILED...`);
        const { data: updatedTx, error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            error_message: matchedSettlement.Message || matchedSettlement.message || `Payment ${settlementStatus}`,
            metadata: { ...tx.metadata, settlement_data: matchedSettlement, polled_at: new Date().toISOString() }
          })
          .eq('id', tx.id)
          .neq('status', 'completed')
          .select()
          .single();

        if (updateError) {
          console.log('   ⚠️ Failed update error:', updateError.message);
        } else {
          console.log(`   ❌ Transaction ${tx.id} marked as FAILED (${settlementStatus})`);
        }
        results.failed++;

      } else {
        console.log(`   ⏳ Settlement status "${settlementStatus}" - still pending`);
        results.still_pending++;
      }
    }

    const duration = Date.now() - startTime;
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 POLLING RESULTS');
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Completed: ${results.completed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Still Pending: ${results.still_pending}`);
    console.log(`   Duration: ${duration}ms`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} pending transactions`,
      ...results,
      duration_ms: duration
    });

  } catch (error: any) {
    console.error('❌ Poll pending error:', error);
    return NextResponse.json(
      { error: 'Failed to poll pending transactions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for easy testing/triggering
 */
export async function GET(request: NextRequest) {
  // Convert GET to POST
  return POST(request);
}

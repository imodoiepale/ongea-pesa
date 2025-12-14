import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { transaction_id, gate_name } = await request.json();

    if (!transaction_id || !gate_name) {
      return NextResponse.json(
        { error: 'Transaction ID and gate name are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking transaction status: ${transaction_id} for gate ${gate_name}`);

    // Prepare form data for status check
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '1');
    formData.append('transaction_intent', 'Check_Status');
    formData.append('gate_name', gate_name);
    formData.append('transaction_id', transaction_id);

    // Set up timeout for external API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

    let statusResponse;
    try {
      statusResponse = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Status check timed out', status: 'pending' },
          { status: 408 }
        );
      }
      throw fetchError;
    }

    if (!statusResponse.ok) {
      console.error(`❌ Status check failed: ${statusResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to check status', status: 'pending' },
        { status: 500 }
      );
    }

    const statusData = await statusResponse.json();
    console.log('📊 Transaction status:', statusData);

    // Update transaction in database based on status
    // NOTE: Use .neq('status', 'completed') to prevent double-crediting via DB trigger
    if (statusData.status === 'success' || statusData.Status === 'Success') {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          metadata: statusData
        })
        .eq('user_id', user.id)
        .eq('id', transaction_id)
        .neq('status', 'completed'); // Prevent double-crediting

      if (updateError) {
        console.log('⚠️ Transaction update skipped (likely already completed)');
      }

      return NextResponse.json({
        status: 'completed',
        message: 'Transaction completed successfully',
        data: statusData
      });
    } else if (statusData.status === 'failed' || statusData.Status === 'Failed') {
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          metadata: statusData
        })
        .eq('user_id', user.id)
        .eq('id', transaction_id)
        .neq('status', 'completed'); // Don't update if already completed

      return NextResponse.json({
        status: 'failed',
        message: statusData.Message || statusData.message || 'Transaction failed',
        data: statusData
      });
    }

    // Still pending
    return NextResponse.json({
      status: 'pending',
      message: 'Transaction is still processing',
      data: statusData
    });

  } catch (error: any) {
    console.error('❌ Transaction status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check transaction status',
        details: error?.message || 'Unknown error',
        status: 'pending'
      },
      { status: 500 }
    );
  }
}

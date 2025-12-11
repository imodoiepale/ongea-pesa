import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get Gate Balance from both Database and IndexPay API
 * Returns wallet balance from DB and gate balance from external API
 */
export async function GET(request: NextRequest) {
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

    console.log('💰 Fetching balances for user:', user.email);

    // Get user's profile data including wallet balance
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, gate_id, gate_name, wallet_balance, phone_number')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Get wallet balance from database
    const walletBalance = parseFloat(String(userData.wallet_balance || 0));
    console.log('📊 DB Wallet Balance:', walletBalance);

    let gateBalance: number | null = null;
    let gateBalanceError: string | null = null;

    // If user has a gate, fetch balance from IndexPay API
    if (userData.gate_name) {
      console.log('🔍 Fetching gate balance from IndexPay API...');
      console.log('   Gate Name:', userData.gate_name);
      console.log('   Gate ID:', userData.gate_id);

      try {
        // Prepare form data for gate balance check
        const formData = new FormData();
        formData.append('user_email', 'info@nsait.co.ke');
        formData.append('request', '6'); // Request type 6 for gate info
        formData.append('gate_name', userData.gate_name);

        // Call IndexPay API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

        const gateResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (gateResponse.ok) {
          const gateData = await gateResponse.json();
          console.log('📡 Gate API Response:', gateData);

          if (gateData.status && gateData.gate_balance !== undefined) {
            gateBalance = parseFloat(String(gateData.gate_balance || 0));
            console.log('✅ Gate Balance from API:', gateBalance);
          } else {
            gateBalanceError = gateData.Message || 'Unable to fetch gate balance';
            console.warn('⚠️ Gate balance not available:', gateBalanceError);
          }
        } else {
          gateBalanceError = `API returned ${gateResponse.status}`;
          console.warn('⚠️ Gate API request failed:', gateBalanceError);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          gateBalanceError = 'Request timed out';
        } else {
          gateBalanceError = error.message || 'Unknown error';
        }
        console.error('❌ Error fetching gate balance:', error);
      }
    } else {
      gateBalanceError = 'No gate configured for user';
      console.log('⚠️ User has no gate configured');
    }

    // Prepare response
    const response: any = {
      success: true,
      user_id: user.id,
      user_email: userData.email,
      
      // Database wallet balance
      wallet_balance: walletBalance,
      wallet_balance_formatted: `KSh ${walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      
      // Gate information
      gate_id: userData.gate_id,
      gate_name: userData.gate_name,
      
      // Gate balance from API
      gate_balance: gateBalance,
      gate_balance_formatted: gateBalance !== null 
        ? `KSh ${gateBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null,
      gate_balance_error: gateBalanceError,
      
      // Comparison
      balances_match: gateBalance !== null ? Math.abs(walletBalance - gateBalance) < 0.01 : null,
      difference: gateBalance !== null ? walletBalance - gateBalance : null,
      
      timestamp: new Date().toISOString(),
    };

    console.log('');
    console.log('📊 BALANCE SUMMARY:');
    console.log('   Wallet (DB):', response.wallet_balance_formatted);
    console.log('   Gate (API):', response.gate_balance_formatted || 'N/A');
    if (response.balances_match !== null) {
      console.log('   Match:', response.balances_match ? '✅ YES' : '❌ NO');
      if (!response.balances_match) {
        console.log('   Difference: KSh', response.difference?.toFixed(2));
      }
    }
    console.log('');

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Balance fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to refresh/sync balances
 */
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

    console.log('🔄 Syncing balances for user:', user.email);

    // Get user's profile
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('gate_name, wallet_balance')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData || !userData.gate_name) {
      return NextResponse.json(
        { error: 'User profile or gate not found' },
        { status: 400 }
      );
    }

    // Fetch fresh gate balance from API
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '6');
    formData.append('gate_name', userData.gate_name);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const gateResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!gateResponse.ok) {
      throw new Error('Failed to fetch gate balance');
    }

    const gateData = await gateResponse.json();

    if (!gateData.status || gateData.gate_balance === undefined) {
      return NextResponse.json(
        { error: 'Gate balance not available', details: gateData },
        { status: 400 }
      );
    }

    const gateBalance = parseFloat(String(gateData.gate_balance || 0));
    const currentWalletBalance = parseFloat(String(userData.wallet_balance || 0));

    console.log('💰 Current wallet balance:', currentWalletBalance);
    console.log('💰 Gate balance from API:', gateBalance);

    // Update wallet balance to match gate balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: gateBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Wallet balance synced to match gate balance');

    return NextResponse.json({
      success: true,
      message: 'Balance synced successfully',
      previous_wallet_balance: currentWalletBalance,
      new_wallet_balance: gateBalance,
      gate_balance: gateBalance,
      difference: currentWalletBalance - gateBalance,
      synced_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Balance sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync balance',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

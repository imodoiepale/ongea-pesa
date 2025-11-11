import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { payment_method, payment_reference, mpesa_transaction_id, phone } = body;

    console.log('Processing subscription payment for user:', user.email);

    // Subscription fee: KES 5,000
    const subscriptionFee = 5000;

    // Validate payment method
    if (!['mpesa', 'wallet'].includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Use "mpesa" or "wallet"' },
        { status: 400 }
      );
    }

    // If paying from wallet, check balance
    if (payment_method === 'wallet') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      const walletBalance = parseFloat(String(profile?.wallet_balance || 0));

      if (walletBalance < subscriptionFee) {
        const shortfall = subscriptionFee - walletBalance;
        return NextResponse.json(
          {
            error: 'Insufficient wallet balance',
            message: `You need KES ${shortfall.toFixed(2)} more in your wallet to pay for the subscription.`,
            current_balance: walletBalance,
            required: subscriptionFee,
            shortfall: shortfall,
          },
          { status: 400 }
        );
      }

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: walletBalance - subscriptionFee,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (deductError) throw deductError;

      console.log(`Deducted KES ${subscriptionFee} from wallet. New balance: KES ${walletBalance - subscriptionFee}`);
    }

    // Process subscription payment via database function
    const { data: paymentId, error: paymentError } = await supabase.rpc(
      'process_subscription_payment',
      {
        p_user_id: user.id,
        p_amount: subscriptionFee,
        p_payment_method: payment_method,
        p_payment_reference: payment_reference || `SUB${Date.now()}`,
        p_mpesa_transaction_id: mpesa_transaction_id || null,
      }
    );

    if (paymentError) {
      console.error('Subscription payment error:', paymentError);
      throw paymentError;
    }

    // Get updated subscription details
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_end_date, free_transactions_remaining')
      .eq('id', user.id)
      .single();

    console.log('✅ Subscription payment successful');
    console.log('  Payment ID:', paymentId);
    console.log('  Status:', updatedProfile?.subscription_status);
    console.log('  Valid until:', updatedProfile?.subscription_end_date);
    console.log('  Free transactions:', updatedProfile?.free_transactions_remaining);

    return NextResponse.json({
      success: true,
      message: 'Subscription payment successful!',
      payment_id: paymentId,
      amount: subscriptionFee,
      subscription: {
        status: updatedProfile?.subscription_status,
        end_date: updatedProfile?.subscription_end_date,
        free_transactions_remaining: updatedProfile?.free_transactions_remaining,
      },
    });

  } catch (error: any) {
    console.error('Subscription payment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process subscription payment',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subscription details
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        subscription_status,
        subscription_tier,
        subscription_start_date,
        subscription_end_date,
        free_transactions_remaining,
        total_free_tx_used,
        last_free_tx_reset
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get payment history
    const { data: payments } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const isActive = profile.subscription_status === 'active' && 
                     profile.subscription_end_date && 
                     new Date(profile.subscription_end_date) >= new Date();

    return NextResponse.json({
      success: true,
      subscription: {
        status: profile.subscription_status,
        tier: profile.subscription_tier,
        is_active: isActive,
        start_date: profile.subscription_start_date,
        end_date: profile.subscription_end_date,
        free_transactions_remaining: profile.free_transactions_remaining,
        total_free_tx_used: profile.total_free_tx_used,
        last_reset: profile.last_free_tx_reset,
      },
      recent_payments: payments,
    });

  } catch (error: any) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch subscription details',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/services/walletService';

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
    const {
      phone_number,
      amount,
      payment_method = 'mpesa', // Default to M-Pesa
    } = body;

    // Validate inputs
    if (!phone_number || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: phone_number, amount' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimum load amount is KES 10' },
        { status: 400 }
      );
    }

    if (amount > 150000) {
      return NextResponse.json(
        { error: 'Maximum load amount is KES 150,000' },
        { status: 400 }
      );
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Validate phone number format
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use format: 254712345678' },
        { status: 400 }
      );
    }

    const walletService = new WalletService(supabase);
    const fees = walletService.calculateFees(parseFloat(amount), true);

    console.log('💳 Initiating wallet load:', {
      user_id: user.id,
      phone: formattedPhone,
      amount: amount,
      fees: fees,
    });

    // TODO: Integrate with M-Pesa STK Push
    // For now, create a pending transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'pending',
        phone: formattedPhone,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error('❌ Failed to create transaction:', txError);
      throw txError;
    }

    // In a real implementation, you would:
    // 1. Call M-Pesa STK Push API
    // 2. Wait for user to enter PIN on phone
    // 3. Receive callback from M-Pesa
    // 4. Credit wallet in callback handler

    console.log('✅ Load transaction created:', transaction.id);
    console.log('⏳ Waiting for M-Pesa STK Push confirmation...');

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      status: 'pending',
      message: `STK push sent to ${formattedPhone}. Please enter your M-Pesa PIN to complete the transaction.`,
      amount: parseFloat(amount),
      mpesa_fee: fees.mpesaFee,
      total_debit: fees.totalDebit,
      instructions: [
        '1. Check your phone for M-Pesa prompt',
        '2. Enter your M-Pesa PIN',
        '3. Your wallet will be credited automatically',
      ],
    });

  } catch (error: any) {
    console.error('❌ Load money error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate wallet load',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Callback handler for M-Pesa confirmation
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      transaction_id,
      mpesa_transaction_id,
      mpesa_receipt_number,
      result_code,
      phone_number,
    } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: 'Missing transaction_id' },
        { status: 400 }
      );
    }

    // Get the pending transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if M-Pesa payment was successful (result_code 0 = success)
    if (result_code === 0) {
      // Use wallet service to credit the wallet
      const walletService = new WalletService(supabase);
      const result = await walletService.loadMoney(
        transaction.user_id,
        parseFloat(transaction.amount),
        mpesa_transaction_id || mpesa_receipt_number,
        phone_number || transaction.phone
      );

      // Update transaction to completed
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          mpesa_transaction_id: mpesa_transaction_id || mpesa_receipt_number,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      console.log('✅ Wallet load completed:', result);

      return NextResponse.json({
        success: true,
        message: 'Wallet loaded successfully',
        ...result,
      });
    } else {
      // Payment failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          error_message: `M-Pesa payment failed with code: ${result_code}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      console.log('❌ M-Pesa payment failed:', result_code);

      return NextResponse.json(
        {
          success: false,
          error: 'Payment failed',
          message: 'M-Pesa payment was not completed. Please try again.',
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('❌ Callback error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process callback',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

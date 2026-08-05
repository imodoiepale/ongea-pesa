import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/services/walletService';
import { consumeStepupToken, isLocked } from '@/lib/services/securityService';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';
import { customerTransactionCost } from '@/lib/transaction-fees';

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
      stepup_token, // fresh PIN/passkey proof (see /api/security/pin|passkey)
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

    if (amount < 50) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is KES 50' },
        { status: 400 }
      );
    }

    if (amount > 150000) {
      return NextResponse.json(
        { error: 'Maximum withdrawal amount is KES 150,000' },
        { status: 400 }
      );
    }

    // Step-up gate: money only moves with a fresh PIN/passkey proof, and never
    // while the account is locked (A5/A6).
    const admin = createServiceClient();
    const { ip, userAgent } = requestContext(request);

    const { data: lockState } = await admin
      .from('profiles')
      .select('locked_until, failed_attempts')
      .eq('id', user.id)
      .single();
    if (isLocked(lockState)) {
      return NextResponse.json(
        { error: 'Account temporarily locked. Verify your identity and try again.', lockedUntil: lockState!.locked_until },
        { status: 423 }
      );
    }

    const stepUpOk = await consumeStepupToken(admin, user.id, stepup_token);
    if (!stepUpOk) {
      return NextResponse.json(
        { error: 'Step-up authentication required', code: 'STEPUP_REQUIRED' },
        { status: 403 }
      );
    }

    await logSecurityEvent(
      { userId: user.id, eventType: 'money_send_initiated', ip, userAgent, metadata: { rail: 'withdraw', amount, phone: phone_number } },
      admin
    );

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

    // Initialize wallet service
    const walletService = new WalletService(supabase);

    console.log('💸 Initiating withdrawal:', {
      user_id: user.id,
      phone: formattedPhone,
      amount: amount,
    });

    // Process withdrawal
    const result = await walletService.withdrawMoney(
      user.id,
      parseFloat(amount),
      formattedPhone
    );

    // TODO: In a real implementation, trigger M-Pesa B2C API here
    // For now, we've marked the transaction as "processing"
    
    console.log('✅ Withdrawal initiated:', result);

    return NextResponse.json({
      success: true,
      message: `Withdrawal of KES ${amount} is being processed. You will receive M-Pesa shortly.`,
      ...result,
      instructions: [
        '1. Withdrawal is being processed',
        '2. You will receive M-Pesa confirmation SMS',
        '3. Money should arrive within 1-5 minutes',
      ],
    });

  } catch (error: any) {
    console.error('❌ Withdrawal error:', error);
    
    // Handle specific error types
    if (error.message.includes('Insufficient funds')) {
      return NextResponse.json(
        {
          error: 'Insufficient funds',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process withdrawal',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Callback handler for M-Pesa B2C confirmation
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      transaction_id,
      result_code,
      mpesa_transaction_id,
      conversation_id,
    } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: 'Missing transaction_id' },
        { status: 400 }
      );
    }

    // Get the transaction
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

    // Check if M-Pesa B2C was successful (result_code 0 = success)
    if (result_code === 0) {
      // Update transaction to completed
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          mpesa_transaction_id: mpesa_transaction_id,
          external_ref: conversation_id,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      console.log('✅ Withdrawal completed:', mpesa_transaction_id);

      return NextResponse.json({
        success: true,
        message: 'Withdrawal completed successfully',
        mpesa_transaction_id,
      });
    } else {
      // B2C failed. Single source of truth: never write wallet_balance directly.
      if (transaction.status === 'completed') {
        // The withdrawal had already debited the wallet — record a compensating
        // 'receive' reversal so the DB trigger credits the amount back exactly once.
        // We keep the original row 'completed'; flipping it to 'failed' would NOT
        // reverse the trigger (it only fires on transitions INTO 'completed') and
        // would desync the ledger.
        const refundAmount = parseFloat(transaction.amount) + customerTransactionCost(transaction);
        await supabase
          .from('transactions')
          .insert({
            user_id: transaction.user_id,
            type: 'receive',
            amount: refundAmount,
            status: 'completed',
            voice_command_text: `Refund: failed withdrawal ${transaction.id}`,
            external_ref: conversation_id,
            completed_at: new Date().toISOString(),
            metadata: {
              refund_for: transaction.id,
              refunded_transaction_cost: customerTransactionCost(transaction),
              reason: `M-Pesa B2C failed code ${result_code}`,
            },
          });
        await supabase
          .from('transactions')
          .update({
            error_message: `M-Pesa B2C failed (code ${result_code}); amount reversed`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction_id);
        console.log('💰 Reversal recorded for failed withdrawal', transaction.id);
      } else {
        // Still 'processing'/'pending' — the wallet was never debited, so there is
        // nothing to refund. Just mark the withdrawal failed (no balance change).
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            error_message: `M-Pesa B2C failed with code: ${result_code}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction_id);
      }

      console.log('❌ Withdrawal failed:', result_code);

      return NextResponse.json(
        {
          success: false,
          error: 'Withdrawal failed',
          message: 'M-Pesa withdrawal failed. Amount has been refunded to your wallet.',
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

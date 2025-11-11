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
      recipient_identifier, // email, phone, or user_id
      amount,
      transaction_type, // c2c, c2b, b2c, b2b
      description,
      pin, // TODO: Implement PIN verification
    } = body;

    // Validate inputs
    if (!recipient_identifier || !amount || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: recipient_identifier, amount, transaction_type' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // TODO: Verify PIN before processing
    if (pin) {
      // Implement PIN verification logic
      console.log('⚠️ PIN verification not yet implemented');
    }

    // Find recipient by identifier (email, phone, or ID)
    let recipientId = recipient_identifier;
    
    // If not a UUID, search by email or phone
    if (!recipient_identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: recipientProfile, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${recipient_identifier},phone_number.eq.${recipient_identifier},mpesa_number.eq.${recipient_identifier}`)
        .single();

      if (recipientError || !recipientProfile) {
        return NextResponse.json(
          { error: 'Recipient not found. Please check the email or phone number.' },
          { status: 404 }
        );
      }

      recipientId = recipientProfile.id;
    }

    // Validate sender and recipient are different
    if (user.id === recipientId) {
      return NextResponse.json(
        { error: 'Cannot send money to yourself' },
        { status: 400 }
      );
    }

    // Initialize wallet service
    const walletService = new WalletService(supabase);

    // Process the transfer
    const result = await walletService.sendMoney({
      senderId: user.id,
      recipientId: recipientId,
      amount: parseFloat(amount),
      transactionType: transaction_type,
      description: description || '',
      metadata: {
        initiated_via: 'app',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('✅ Money sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: `Successfully sent KES ${amount} to recipient`,
      ...result,
    });

  } catch (error: any) {
    console.error('❌ Send money error:', error);
    
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
        error: 'Failed to send money',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

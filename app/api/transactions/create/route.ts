import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ONGEA_ENV } from '@/lib/environment'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      type, 
      data, 
      confidence, 
      status,
      voice_verified,
      confidence_score,
      voice_command_text,
      mpesa_transaction_id,
      external_ref
    } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Pochi La Biashara is not available yet — reject before inserting anything
    if (type === 'buy_goods_pochi') {
      return NextResponse.json(
        {
          success: false,
          error: 'Feature not available',
          message: 'Pochi la Biashara is not available yet — coming soon.',
          agent_message: "Pochi la Biashara is coming soon and not available yet. Try a Till number, Paybill, or M-Pesa phone send instead.",
        },
        { status: 400 }
      );
    }

    console.log('💾 Creating transaction:', { type, data, confidence, status });

    // Prepare transaction data matching n8n schema
    const transactionData: any = {
      user_id: user.id,
      environment: ONGEA_ENV,
      type,
      status: status || 'pending',
      voice_verified: voice_verified || false,
      confidence_score: confidence_score || confidence || 0,
      voice_command_text: voice_command_text || '',
      mpesa_transaction_id: mpesa_transaction_id || '',
      external_ref: external_ref || '',
      created_at: new Date().toISOString()
    };

    // Add type-specific fields
    switch (type) {
      case 'paybill':
        transactionData.paybill = data.paybill;
        transactionData.account = data.account;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'buy_goods_till':
        transactionData.till = data.till;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'buy_goods_pochi':
        transactionData.phone = data.phone;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'send_phone':
        transactionData.phone = data.phone;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'qr':
        transactionData.till = data.till;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'withdraw':
        transactionData.agent = data.agent;
        transactionData.store = data.store;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'bank_to_mpesa':
      case 'bank_to_bank':
        transactionData.bank_code = data.bankCode;
        transactionData.account = data.account;
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      case 'receipt':
        if (data.receiptData && data.receiptData.amount) {
          transactionData.amount = parseFloat(data.receiptData.amount.replace(/[^0-9.]/g, '') || '0');
        }
        break;

      default:
        if (data.amount) {
          transactionData.amount = parseFloat(data.amount.replace(/[^0-9.]/g, '') || '0');
        }
    }

    // Insert into transactions table
    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert transaction:', insertError);
      return NextResponse.json(
        { error: 'Failed to create transaction', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Transaction created:', transaction.id);

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error: any) {
    console.error('Transaction creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message },
      { status: 500 }
    );
  }
}

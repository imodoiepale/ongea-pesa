import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { payments, totalAmount, balance } = body;

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: 'No payments provided' }, { status: 400 });
    }

    console.log(`📦 Processing batch payment: ${payments.length} payments, total: KSh ${totalAmount}`);

    // Verify balance
    if (balance < totalAmount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        message: `Need KSh ${(totalAmount - balance).toLocaleString()} more`,
        success: false
      }, { status: 400 });
    }

    // Process each payment
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const payment of payments) {
      try {
        // Extract payment details
        const { type, data } = payment;
        
        let paymentData: any = {
          user_id: user.id,
          type,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        // Add type-specific data
        switch (type) {
          case 'paybill':
            paymentData.paybill = data.paybill;
            paymentData.account = data.account;
            paymentData.amount = parseFloat(data.amount?.replace(/[^0-9.]/g, '') || '0');
            break;
          case 'buy_goods_till':
            paymentData.till = data.till;
            paymentData.merchant = data.merchant;
            paymentData.amount = parseFloat(data.amount?.replace(/[^0-9.]/g, '') || '0');
            break;
          case 'buy_goods_pochi':
            paymentData.phone = data.phone;
            paymentData.merchant = data.merchant;
            paymentData.amount = parseFloat(data.amount?.replace(/[^0-9.]/g, '') || '0');
            break;
          case 'qr':
            paymentData.till = data.till;
            paymentData.merchant = data.merchant;
            paymentData.amount = parseFloat(data.amount?.replace(/[^0-9.]/g, '') || '0');
            break;
          default:
            paymentData.amount = parseFloat(data.amount?.replace(/[^0-9.]/g, '') || '0');
        }

        // Insert into transactions table
        const { data: transaction, error: insertError } = await supabase
          .from('transactions')
          .insert(paymentData)
          .select()
          .single();

        if (insertError) {
          console.error('Failed to insert transaction:', insertError);
          failCount++;
          results.push({
            type,
            success: false,
            error: insertError.message
          });
        } else {
          successCount++;
          results.push({
            type,
            success: true,
            transaction_id: transaction.id
          });
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        failCount++;
        results.push({
          type: payment.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update user balance
    if (successCount > 0) {
      const newBalance = balance - totalAmount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (balanceError) {
        console.error('Failed to update balance:', balanceError);
      }
    }

    console.log(`✅ Batch payment complete: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} of ${payments.length} payments`,
      successCount,
      failCount,
      results,
      newBalance: balance - totalAmount
    });

  } catch (error: any) {
    console.error('Batch payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch payment', details: error.message },
      { status: 500 }
    );
  }
}

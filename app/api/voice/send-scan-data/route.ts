import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// M-Pesa fee calculator
function calculateTransactionFees(amount: number) {
  const mpesaFees = [
    { min: 1, max: 100, fee: 0 },
    { min: 101, max: 500, fee: 5 },
    { min: 501, max: 1000, fee: 10 },
    { min: 1001, max: 1500, fee: 15 },
    { min: 1501, max: 2500, fee: 20 },
    { min: 2501, max: 3500, fee: 25 },
    { min: 3501, max: 5000, fee: 30 },
    { min: 5001, max: 7500, fee: 35 },
    { min: 7501, max: 10000, fee: 40 },
    { min: 10001, max: 15000, fee: 45 },
    { min: 15001, max: 20000, fee: 50 },
    { min: 20001, max: 35000, fee: 60 },
    { min: 35001, max: 50000, fee: 70 },
  ];

  let mpesaFee = 105; // Default for amounts above 50k
  for (const bracket of mpesaFees) {
    if (amount >= bracket.min && amount <= bracket.max) {
      mpesaFee = bracket.fee;
      break;
    }
  }

  const platformFee = Math.round(amount * 0.005); // 0.5% Ongea Pesa fee
  const totalFee = mpesaFee + platformFee;
  const totalDebit = amount + totalFee;

  return { mpesaFee, platformFee, totalFee, totalDebit };
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scanResult, balance } = body;

    if (!scanResult) {
      return NextResponse.json({ error: 'Scan result required' }, { status: 400 });
    }

    // Get user's current balance if not provided
    let userBalance = balance;
    if (!userBalance) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      
      userBalance = profile?.balance || 0;
    }

    // Calculate fees if amount is provided
    let fees = null;
    if (scanResult.data.amount) {
      const amountNum = parseFloat(scanResult.data.amount.replace(/[^0-9.]/g, ''));
      if (!isNaN(amountNum) && amountNum > 0) {
        fees = calculateTransactionFees(amountNum);
      }
    }

    // Format the message for the AI based on scan type
    const message = formatScanMessage(scanResult, userBalance, fees);

    console.log('✅ Scan data formatted for real-time voice context');
    console.log('📤 Message:', message);

    // Return structured data for real-time voice context
    return NextResponse.json({
      success: true,
      message,
      scanData: {
        type: scanResult.type,
        data: scanResult.data,
        confidence: scanResult.confidence,
        balance: userBalance,
        userId: user.id,
        fees
      },
      // Formatted for ElevenLabs conversation context
      contextMessage: `PAYMENT SCANNED: ${message}`
    });

  } catch (error: any) {
    console.error('Error processing scan data:', error);
    return NextResponse.json(
      { error: 'Failed to process scan data', details: error.message },
      { status: 500 }
    );
  }
}

function formatScanMessage(scanResult: any, balance: number, fees: any = null): string {
  const { type, data, confidence } = scanResult;
  const balanceFormatted = `KSh ${balance.toLocaleString()}`;
  
  // Build fee message if fees are calculated
  let feeMessage = '';
  let insufficientFundsWarning = '';
  
  if (fees) {
    feeMessage = ` M-Pesa fee: KSh ${fees.mpesaFee}. Ongea Pesa platform fee: KSh ${fees.platformFee}. Total cost: KSh ${fees.totalDebit.toLocaleString()}.`;
    
    // Check if balance is insufficient
    if (balance < fees.totalDebit) {
      const shortfall = fees.totalDebit - balance;
      insufficientFundsWarning = ` WARNING: Your balance is insufficient. You need KSh ${shortfall.toLocaleString()} more. Would you like to add funds to your wallet first?`;
    } else if (balance - fees.totalDebit < 100) {
      // Low balance warning (less than 100 remaining)
      const remaining = balance - fees.totalDebit;
      insufficientFundsWarning = ` Note: After this payment, you'll only have KSh ${remaining.toLocaleString()} remaining. Consider adding funds soon.`;
    }
  }

  switch (type) {
    case 'paybill':
      return `Paybill detected! Number ${data.paybill}, Account ${data.account || 'not specified'}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}${insufficientFundsWarning}` : 'No amount specified.'
      } Your current balance is ${balanceFormatted}. Confidence ${confidence}%. ${insufficientFundsWarning ? 'Please add funds before proceeding.' : 'Would you like to proceed with this payment?'}`;

    case 'buy_goods_till':
      return `Till number detected! ${data.till}${data.merchant ? ` for ${data.merchant}` : ''}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}` : 'No amount specified.'
      } Your balance is ${balanceFormatted}. Confidence ${confidence}%. Should I proceed with this payment?`;

    case 'buy_goods_pochi':
      return `Pochi la Biashara detected! Phone number ${data.phone}${data.merchant ? ` for ${data.merchant}` : ''}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}` : 'No amount specified.'
      } Your balance is ${balanceFormatted}. Confidence ${confidence}%. Shall we proceed?`;

    case 'send_phone':
      return `Phone number detected for sending money: ${data.phone}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}` : 'Please specify the amount.'
      } Your current balance is ${balanceFormatted}. Confidence ${confidence}%. Ready to send?`;

    case 'withdraw':
      return `Withdrawal detected! Agent ${data.agent}, Store ${data.store || 'not specified'}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}` : 'No amount specified.'
      } Your balance is ${balanceFormatted}. Confidence ${confidence}%. Proceed with withdrawal?`;

    case 'bank_to_mpesa':
    case 'bank_to_bank':
      return `Bank transfer detected! Bank code ${data.bankCode}, Account ${data.account}. ${
        data.amount ? `Amount ${data.amount}.${feeMessage}` : 'No amount specified.'
      } Your balance is ${balanceFormatted}. Confidence ${confidence}%. Should I initiate this transfer?`;

    case 'receipt':
      if (data.receiptData) {
        return `Receipt scanned! Vendor: ${data.receiptData.vendor}, Amount: ${data.receiptData.amount}, Date: ${data.receiptData.date}, Category: ${data.receiptData.category}. Your balance is ${balanceFormatted}. Confidence ${confidence}%. Would you like to save this receipt?`;
      }
      return `Receipt detected but details unclear. Confidence ${confidence}%. Please try again.`;

    case 'qr':
      return `QR code detected! ${data.till ? `Till ${data.till}` : 'Payment information extracted'}${
        data.merchant ? ` for ${data.merchant}` : ''
      }. ${data.amount ? `Amount ${data.amount}.${feeMessage}` : 'No amount specified.'} Your balance is ${balanceFormatted}. Confidence ${confidence}%. Proceed?`;

    default:
      return `Payment document scanned with ${confidence}% confidence. Your current balance is ${balanceFormatted}. Please review the extracted details and confirm.`;
  }
}

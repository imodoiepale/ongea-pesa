import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/services/walletService';

// Scanner payment route — no step-up for now; step-up deferred per product decision.
// Routes scanned till / paybill / phone payments through the real NCBA rail via
// WalletService.resolveRailAndSend(), inserting processing→completed/failed lifecycle.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, destination, narration } = body;
    // destination shape: { kind: 'till'|'paybill'|'phone', till?, paybill?, account?, phone?, recipientName? }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    if (!destination?.kind) {
      return NextResponse.json({ error: 'destination.kind is required (till|paybill|phone)' }, { status: 400 });
    }

    const walletService = new WalletService(supabase);
    const result = await walletService.resolveRailAndSend({
      userId: user.id,
      amount: parseFloat(amount),
      destination,
      narration: narration || 'Scanner payment',
    });

    return NextResponse.json({
      success: true,
      message: result.message || `KSh ${amount} sent via ${destination.kind}`,
      transaction_id: result.transaction_id,
      bank_ref: result.bank_ref,
    });
  } catch (err: any) {
    console.error('Scanner pay error:', err);
    if (err.message?.includes('Insufficient funds')) {
      return NextResponse.json({ error: 'Insufficient funds', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Payment failed', message: err.message || 'Unknown error' }, { status: 500 });
  }
}

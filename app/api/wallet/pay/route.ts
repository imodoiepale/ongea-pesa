import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/services/walletService';
import { consumeStepupToken, isLocked } from '@/lib/services/securityService';

// Scanner payment route — routes scanned till / paybill / phone payments through
// the real NCBA rail via WalletService.resolveRailAndSend(), inserting
// processing→completed/failed lifecycle. Requires step-up before money moves.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, destination, narration, stepup_token } = body;
    // destination shape: { kind: 'till'|'paybill'|'phone', till?, paybill?, account?, phone?, recipientName? }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    if (!destination?.kind) {
      return NextResponse.json({ error: 'destination.kind is required (till|paybill|phone)' }, { status: 400 });
    }

    // Step-up gate: money only moves with a fresh PIN/passkey proof, and never
    // while the account is locked (A5/A6).
    const admin = createServiceClient();

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

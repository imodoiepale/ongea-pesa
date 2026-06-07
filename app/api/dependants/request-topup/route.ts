import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/dependants/request-topup
 *
 * Initiates a Daraja STK push to a dependant's phone, crediting the
 * authenticated owner's wallet.
 *
 * Body: { dependant_id: string, amount: number }
 *
 * Flow:
 *  1. Authenticate owner
 *  2. Load dependant (ownership-scoped)
 *  3. Validate amount
 *  4. Call /api/daraja/stk-deposit with dependant's phone; authenticated user = owner,
 *     so the transaction user_id = owner → owner's wallet/pocket gets the credit.
 *  5. Return { success, transaction_id, checkout_request_id, dependant_name }
 *
 * After the STK completes (Daraja callback sets status=completed), the owner's
 * wallet_balance and user_pockets.balance are automatically incremented by the
 * existing DB triggers.  The client should then call
 *   PATCH /api/dependants { id, increment_contribution: amount }
 * to record the dependant's total_contributed.
 *
 * STUB: If /api/daraja/stk-deposit is not yet reachable (WS-A not merged),
 * this endpoint returns 503 so that WS-B can be tested independently.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate owner
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { dependant_id, amount } = body as {
      dependant_id?: string;
      amount?: number;
    };

    if (!dependant_id) {
      return NextResponse.json({ error: 'dependant_id is required' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (parsedAmount > 999999) {
      return NextResponse.json({ error: 'amount exceeds maximum allowed (999,999 KES)' }, { status: 400 });
    }

    // 2. Load dependant — RLS already scopes to owner, but double-check user_id
    const { data: dependant, error: depError } = await supabase
      .from('dependants')
      .select('id, display_name, normalized_phone, phone')
      .eq('id', dependant_id)
      .eq('user_id', user.id)
      .single();

    if (depError || !dependant) {
      return NextResponse.json({ error: 'Dependant not found' }, { status: 404 });
    }

    // 3. Call /api/daraja/stk-deposit
    //    The request is made from the owner's session, so the server-side route
    //    will read auth.getUser() → owner.  The STK phone is the dependant's number.
    //    If WS-A hasn't shipped the endpoint yet, we stub with a 503.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;

    let stkResponse: Response;
    try {
      stkResponse = await fetch(`${baseUrl}/api/daraja/stk-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the cookie so the server-side route sees the owner session
          Cookie: request.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({
          phone: dependant.normalized_phone,
          amount: parsedAmount,
          description: `Top-up by ${dependant.display_name}`,
          // Metadata so the callback can later increment total_contributed
          metadata: {
            dependant_id: dependant.id,
            dependant_phone: dependant.normalized_phone,
            topup_type: 'dependant',
          },
        }),
      });
    } catch (fetchErr: any) {
      console.error('Failed to reach /api/daraja/stk-deposit:', fetchErr);
      return NextResponse.json(
        {
          error: 'Daraja rail not yet active',
          message:
            'The STK deposit endpoint is not reachable. Please ensure WS-A (daraja/stk-deposit) is deployed.',
          stub: true,
        },
        { status: 503 }
      );
    }

    // If /api/daraja/stk-deposit doesn't exist yet (404) or returned an error
    if (stkResponse.status === 404) {
      return NextResponse.json(
        {
          error: 'Daraja rail not yet active',
          message: '/api/daraja/stk-deposit endpoint not found. Deploy WS-A first.',
          stub: true,
        },
        { status: 503 }
      );
    }

    const stkData = await stkResponse.json();

    if (!stkResponse.ok || !stkData.success) {
      console.error('STK deposit failed:', stkData);
      return NextResponse.json(
        {
          error: stkData.error || 'Failed to initiate STK push',
          details: stkData,
        },
        { status: stkResponse.status >= 400 ? stkResponse.status : 502 }
      );
    }

    // 4. Success — return enriched response
    return NextResponse.json({
      success: true,
      transaction_id: stkData.transaction_id,
      checkout_request_id: stkData.checkout_request_id,
      dependant_name: dependant.display_name,
      dependant_phone: dependant.phone,
      amount: parsedAmount,
      message: `STK push sent to ${dependant.display_name} (${dependant.phone}). Ask them to enter their M-Pesa PIN.`,
    });
  } catch (err: any) {
    console.error('POST /api/dependants/request-topup unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

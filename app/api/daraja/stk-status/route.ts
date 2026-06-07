import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple polling endpoint — uses the browser client so RLS ensures
// users can only see their own transactions.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('id, status, amount, mpesa_transaction_id, completed_at, error_message')
      .eq('id', transaction_id)
      .eq('user_id', user.id) // Belt-and-suspenders ownership check alongside RLS
      .single();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      transaction_id: tx.id,
      status: tx.status,
      amount: tx.amount,
      mpesa_receipt: tx.mpesa_transaction_id,
      completed_at: tx.completed_at,
      error_message: tx.error_message,
    });
  } catch (err: any) {
    console.error('❌ STK status error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}

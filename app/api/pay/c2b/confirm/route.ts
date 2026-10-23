import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Daraja C2B Confirmation URL: Safaricom POSTs here after a PayBill/Till payment completes.
// Registered as .../api/pay/c2b/confirm?s=<C2B_CALLBACK_SECRET> (Daraja sends no signature).
// Idempotent on TransID. A failed insert returns 500 so the payment is never silently lost.
export async function POST(request: NextRequest) {
  const secret = process.env.C2B_CALLBACK_SECRET;
  if (!secret || request.nextUrl.searchParams.get('s') !== secret) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const allowed = (process.env.DARAJA_C2B_SHORTCODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!body?.TransID || !body?.TransAmount || (allowed.length && !allowed.includes(String(body.BusinessShortCode)))) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 400 });
  }

  // TransTime is YYYYMMDDHHmmss in Nairobi time
  const t = String(body.TransTime || '');
  const transTime = /^\d{14}$/.test(t)
    ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}+03:00`
    : null;

  const row = {
    trans_id: body.TransID,
    trans_type: body.TransactionType ?? null,
    amount: Number(body.TransAmount),
    shortcode: String(body.BusinessShortCode),
    bill_ref: body.BillRefNumber || null,
    msisdn: body.MSISDN ?? null,
    first_name: body.FirstName ?? null,
    trans_time: transTime,
    org_balance: body.OrgAccountBalance ? Number(body.OrgAccountBalance) : null,
    raw: body,
  };

  // Local testing without Supabase: C2B_STORE=json appends to .c2b-payments.json (never in production).
  if (process.env.C2B_STORE === 'json' && process.env.NODE_ENV !== 'production') {
    const fs = await import('node:fs/promises');
    const file = `${process.cwd()}/.c2b-payments.json`;
    const all: (typeof row)[] = JSON.parse(await fs.readFile(file, 'utf8').catch(() => '[]'));
    if (!all.some((r) => r.trans_id === row.trans_id)) all.unshift(row);
    await fs.writeFile(file, JSON.stringify(all, null, 2));
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const { error } = await createServiceClient()
    .from('c2b_payments')
    .upsert(row, { onConflict: 'trans_id', ignoreDuplicates: true });

  if (error) {
    console.error('[c2b/confirm] insert failed', body.TransID, error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Retry' }, { status: 500 });
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

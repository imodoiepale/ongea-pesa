import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { WalletService } from '@/lib/services/walletService'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Fetch the bill
  const { data: bill, error: fetchErr } = await service
    .from('saved_bills')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  if (bill.status === 'paid') return NextResponse.json({ success: true, message: 'Already paid', alreadyPaid: true })
  if (bill.status === 'cancelled') return NextResponse.json({ error: 'Bill is cancelled' }, { status: 400 })

  // Build destination from bill fields
  let destination: Parameters<WalletService['resolveRailAndSend']>[0]['destination']
  if (bill.till) {
    destination = { kind: 'till', till: bill.till, recipientName: bill.merchant }
  } else if (bill.paybill) {
    destination = { kind: 'paybill', paybill: bill.paybill, account: bill.account, recipientName: bill.merchant }
  } else if (bill.phone) {
    destination = { kind: 'phone', phone: bill.phone, recipientName: bill.merchant }
  } else {
    return NextResponse.json({ error: 'No payable destination on this bill' }, { status: 400 })
  }

  const walletService = new WalletService(service)
  let result: any
  try {
    result = await walletService.resolveRailAndSend({
      userId: user.id,
      amount: Number(bill.amount),
      destination,
      narration: `Saved bill: ${bill.merchant || bill.type}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Payment failed' }, { status: 500 })
  }

  // Mark paid
  await service
    .from('saved_bills')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_transaction_id: result?.transaction_id ?? null,
    })
    .eq('id', params.id)

  return NextResponse.json({ success: true, message: 'Bill paid', transaction: result })
}

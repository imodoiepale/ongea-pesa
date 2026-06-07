import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // body: { type, amount, phone?, till?, paybill?, account?, merchant?, receipt_path?, scan_payload?, confidence? }
  const { type, amount, phone, till, paybill, account, merchant, receipt_path, scan_payload, confidence } = body

  if (!type || !amount) return NextResponse.json({ error: 'type and amount required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('saved_bills')
    .insert({
      user_id: user.id,
      type,
      amount,
      phone: phone ?? '',
      till: till ?? '',
      paybill: paybill ?? '',
      account: account ?? '',
      merchant: merchant ?? '',
      receipt_path: receipt_path ?? '',
      scan_payload,
      confidence,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bill: data })
}

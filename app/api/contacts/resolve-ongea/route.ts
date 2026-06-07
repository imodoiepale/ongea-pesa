import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  // Normalize: strip +254 prefix and leading zeros, try both formats
  const normalized = phone.replace(/^\+254/, '0').replace(/^254/, '0')
  const intl = normalized.replace(/^0/, '+254')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, phone_number, mpesa_number')
    .or(`phone_number.eq.${normalized},phone_number.eq.${intl},mpesa_number.eq.${normalized},mpesa_number.eq.${intl}`)
    .neq('id', user.id)   // exclude self
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ isOngeaUser: false })
  }
  return NextResponse.json({
    isOngeaUser: true,
    recipientId: profile.id,
    recipientName: profile.full_name || 'Ongea User',
  })
}

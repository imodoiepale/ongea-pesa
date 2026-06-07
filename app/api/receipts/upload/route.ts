import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageData, filename } = await req.json()  // imageData = base64 string (no data: prefix)
  if (!imageData) return NextResponse.json({ error: 'imageData required' }, { status: 400 })

  const buffer = Buffer.from(imageData, 'base64')
  const name = filename || `${Date.now()}.jpg`
  const path = `${user.id}/${name}`

  const service = createServiceClient()
  const { error } = await service.storage
    .from('receipts')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })

  if (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Security: only allow access to the user's own folder
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from('receipts')
    .createSignedUrl(path, 3600) // 1-hour URL

  if (error || !data) return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}

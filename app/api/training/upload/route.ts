import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Training-audio upload. Mirrors app/api/receipts/upload/route.ts: authenticate
// with the RLS-bound client for identity, then write with the service client,
// and re-enforce folder scoping explicitly on read.
//
// Audio arrives base64-encoded in JSON, matching the receipts convention rather
// than introducing a second multipart path.

const MAX_BYTES = 10 * 1024 * 1024 // must match the bucket's file_size_limit
const ALLOWED = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg'])

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { audioData?: string; contentType?: string; filename?: string }
    | null

  if (!body?.audioData) {
    return NextResponse.json({ error: 'audioData required' }, { status: 400 })
  }

  const contentType = body.contentType || 'audio/webm'
  // The bucket enforces this too, but a clear 400 beats an opaque storage error.
  if (!ALLOWED.has(contentType.split(';')[0].trim())) {
    return NextResponse.json({ error: `Unsupported audio type: ${contentType}` }, { status: 400 })
  }

  const buffer = Buffer.from(body.audioData, 'base64')
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: 'Audio is empty' }, { status: 400 })
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Recording is too large (max 10 MB)' }, { status: 400 })
  }

  const name = body.filename?.replace(/[^\w.-]/g, '') || `${Date.now()}.webm`
  const path = `${user.id}/${name}`

  const service = createServiceClient()
  const { error } = await service.storage
    .from('sheng-training-audio')
    .upload(path, buffer, { contentType, upsert: false })

  if (error) {
    console.error('❌ Training audio upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path, bytes: buffer.byteLength })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = new URL(req.url).searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Only the owner's folder. Reviewers use /api/training/review, which performs
  // its own reviewer check — this endpoint is strictly self-service.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from('sheng-training-audio')
    .createSignedUrl(path, 3600)

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ url: data.signedUrl })
}

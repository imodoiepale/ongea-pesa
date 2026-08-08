import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { logSecurityEvent } from '@/lib/services/auditService'

// Admin-only control over which voice runtime a user gets.
//
// LiveKit + Fish Audio runs in parallel with ElevenLabs rather than replacing
// it, so the live payment path is never at the mercy of the experimental stack.
// Only admins can move an account onto it; a DB trigger
// (guard_voice_engine_update) blocks the change at the row level even if this
// route were bypassed.

const setEngine = z.object({
  user_id: z.string().uuid(),
  engine: z.enum(['elevenlabs', 'livekit']),
})

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, admin: null, allowed: false as const }
  return { user, admin: createServiceClient(), allowed: isAdminEmail(user.email) }
}

export async function GET() {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('profiles')
    .select('id,email,full_name,voice_engine')
    .order('email', { ascending: true })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = setEngine.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ voice_engine: parsed.data.engine })
    .eq('id', parsed.data.user_id)
    .select('id,email,voice_engine')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Which runtime handles someone's money commands is worth an audit trail.
  await logSecurityEvent(
    {
      userId: parsed.data.user_id,
      eventType: 'voice_engine_changed',
      metadata: { engine: parsed.data.engine, changed_by: user.email },
    },
    admin,
  ).catch(() => undefined)

  return NextResponse.json({ profile: data })
}

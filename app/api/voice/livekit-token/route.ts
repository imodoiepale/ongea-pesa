import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VOICE_RATE_PER_MINUTE } from '@/lib/voice-funding'
import { PLATFORM_FEE_RATE } from '@/lib/transaction-fees'
import { ONGEA_ENV } from '@/lib/environment'

/**
 * Mints a LiveKit room token for the parallel voice runtime.
 *
 * Refuses unless the caller's profiles.voice_engine is 'livekit' — that column
 * is admin-settable only, so this endpoint cannot be used by a normal user to
 * opt themselves onto the experimental stack.
 *
 * Mirrors app/api/get-signed-url/route.ts: same balance precondition, and it
 * opens the same voice_sessions row so billing, the 15-minute expiry and the
 * admin voice-session views work identically across both engines.
 */

const AGENT_IDENTITY_PREFIX = 'ongea-user'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!url || !apiKey || !apiSecret) {
    console.error('❌ LiveKit is not configured (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)')
    return NextResponse.json({ error: 'Voice service is not configured' }, { status: 500 })
  }

  const admin = createServiceClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('voice_engine, wallet_balance, full_name, email, gate_name, gate_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // The gate. Admin-only opt-in, enforced here and by the DB trigger.
  if (profile.voice_engine !== 'livekit') {
    return NextResponse.json(
      { error: 'The LiveKit voice engine is not enabled for this account' },
      { status: 403 },
    )
  }

  // Same affordability precondition as the ElevenLabs path, so a user cannot
  // start a session they cannot pay for the first minute of.
  const balance = Number(profile.wallet_balance ?? 0)
  const firstMinuteDebit = VOICE_RATE_PER_MINUTE * (1 + PLATFORM_FEE_RATE)
  if (balance < firstMinuteDebit) {
    return NextResponse.json(
      { error: `Add at least KSh ${firstMinuteDebit.toFixed(2)} to use voice.` },
      { status: 402 },
    )
  }

  const roomName = `ongea-${user.id}-${Date.now()}`

  // Open the session row up front, exactly as the ElevenLabs path does, so the
  // existing settle endpoint and admin views need no engine-specific handling.
  const { data: session, error: sessionError } = await admin
    .from('voice_sessions')
    .insert({
      user_id: user.id,
      environment: ONGEA_ENV,
      session_id: roomName,
      agent_id: 'livekit-fishaudio',
      status: 'active',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (sessionError) {
    console.error('❌ Could not open LiveKit voice session:', sessionError)
    return NextResponse.json(
      { error: 'Could not start the voice session', details: sessionError.message },
      { status: 500 },
    )
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `${AGENT_IDENTITY_PREFIX}-${user.id}`,
    name: profile.full_name || profile.email || 'Ongea user',
    // Room dies shortly after the wallet-budget ceiling for a session.
    ttl: 16 * 60,
    // The worker reads these instead of querying Supabase itself, matching the
    // dynamic variables handed to the ElevenLabs agent.
    metadata: JSON.stringify({
      user_id: user.id,
      user_email: profile.email ?? '',
      user_name: profile.full_name ?? 'User',
      balance: String(balance),
      gate_name: profile.gate_name ?? '',
      gate_id: profile.gate_id ?? '',
      voice_session_id: session.id,
    }),
  })

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // The agent worker owns the room; the browser only speaks and listens.
    canPublishData: false,
  })

  return NextResponse.json({
    url,
    token: await at.toJwt(),
    room: roomName,
    voiceSessionId: session.id,
    balance,
  })
}

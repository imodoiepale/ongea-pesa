import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { logSecurityEvent } from '@/lib/services/auditService'
import { invalidatePlatformFeeRateCache } from '@/lib/services/platformSettings'

// Admin-configurable platform settings. Replaces the useState stubs on
// /admin-analytics/settings, which accepted input and discarded it.

// Each key is validated on its own terms — a fee rate and a boolean cannot share
// one schema, and an unvalidated jsonb write would let a typo set the platform
// fee to "0.5" (50%) instead of 0.005.
const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Capped at 5%. Anything higher is far more likely a misplaced decimal than
  // an intentional pricing change.
  platform_fee_rate: z.number().min(0).max(0.05),
  email_notifications_enabled: z.boolean(),
  large_transaction_threshold: z.number().min(0).max(1_000_000),
  auto_approve_enabled: z.boolean(),
}

const updateSettings = z.object({
  settings: z.record(z.unknown()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one setting is required',
  }),
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
    .from('platform_settings')
    .select('key,value,description,updated_by,updated_at')
    .order('key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = updateSettings.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const rows: { key: string; value: unknown; updated_by: string; updated_at: string }[] = []
  const now = new Date().toISOString()

  for (const [key, raw] of Object.entries(parsed.data.settings)) {
    const schema = SETTING_SCHEMAS[key]
    if (!schema) {
      return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 })
    }
    const value = schema.safeParse(raw)
    if (!value.success) {
      return NextResponse.json(
        { error: `Invalid value for ${key}`, issues: value.error.flatten() },
        { status: 400 },
      )
    }
    rows.push({ key, value: value.data, updated_by: user.email ?? 'unknown', updated_at: now })
  }

  const { data, error } = await admin
    .from('platform_settings')
    .upsert(rows, { onConflict: 'key' })
    .select('key,value,updated_by,updated_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Drop the 60s cache so the new rate applies to the very next transaction
  // rather than up to a minute later.
  if (rows.some((r) => r.key === 'platform_fee_rate')) invalidatePlatformFeeRateCache()

  // Changing the platform fee changes what every customer is charged. That
  // belongs in the audit trail.
  await logSecurityEvent(
    {
      userId: null,
      eventType: 'platform_settings_changed',
      metadata: { keys: rows.map((r) => r.key), changed_by: user.email },
    },
    admin,
  ).catch(() => undefined)

  return NextResponse.json({ settings: data ?? [] })
}

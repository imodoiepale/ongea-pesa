import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

// Manage the invite-only reviewer allowlist. Admin-gated: granting review access
// is an admin action, even though holding it is not.

const inviteReviewer = z.object({
  email: z.string().trim().email().max(320),
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
    .from('sheng_reviewers')
    .select('id,email,active,invited_by,created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviewers: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = inviteReviewer.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()

  // Link to an existing auth user when there is one, so the reviewer can read
  // their own sheng_reviewers row. Absence is fine — the lookup is by email.
  const { data: existing } = await admin.auth.admin.listUsers()
  const match = existing?.users?.find((u) => u.email?.toLowerCase() === email)

  const { data, error } = await admin
    .from('sheng_reviewers')
    .upsert(
      { email, user_id: match?.id ?? null, active: true, invited_by: user.email },
      { onConflict: 'email' },
    )
    .select('id,email,active,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviewer: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const email = new URL(request.url).searchParams.get('email')?.toLowerCase()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  // Deactivate rather than delete, so past reviews stay attributable.
  const { error } = await admin
    .from('sheng_reviewers')
    .update({ active: false })
    .eq('email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

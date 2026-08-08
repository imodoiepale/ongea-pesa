import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin"

// Admin triage for user feedback. Service client because a reviewer must read
// every user's reports, which RLS correctly forbids for the browser client.

const triage = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "triaged", "in_progress", "resolved", "wont_fix"]).optional(),
  admin_notes: z.string().trim().max(4000).optional(),
})

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, admin: null, allowed: false as const }
  return { user, admin: createServiceClient(), allowed: isAdminEmail(user.email) }
}

export async function GET(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const category = url.searchParams.get("category")

  let query = admin
    .from("feedback_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300)

  // Default view is the open queue. Showing resolved items by default buries
  // the things that still need doing.
  if (status === "open" || !status) {
    query = query.in("status", ["new", "triaged", "in_progress"])
  } else if (status !== "all") {
    query = query.eq("status", status)
  }
  if (category) query = query.eq("category", category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []

  // Attach who filed each one. Reports are far easier to act on when you can
  // reply to the person, and a blocking issue from an active user outranks a
  // minor one from a test account.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[]
  const emails = new Map<string, string>()
  if (userIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,email,full_name")
      .in("id", userIds)
    for (const p of profiles ?? []) emails.set(p.id, p.email || p.full_name || p.id)
  }

  const { count: openCount } = await admin
    .from("feedback_submissions")
    .select("*", { count: "exact", head: true })
    .in("status", ["new", "triaged", "in_progress"])

  return NextResponse.json({
    submissions: rows.map((r) => ({ ...r, reporter: r.user_id ? emails.get(r.user_id) ?? null : null })),
    open_count: openCount ?? 0,
  })
}

export async function PATCH(request: NextRequest) {
  const { user, admin, allowed } = await adminContext()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = triage.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }
  const { id, ...changes } = parsed.data

  const update: Record<string, unknown> = { ...changes }
  // Stamp resolution time when it lands in a terminal state, and clear it if the
  // item is reopened — a stale resolved_at makes the queue untrustworthy.
  if (changes.status) {
    update.resolved_at =
      changes.status === "resolved" || changes.status === "wont_fix"
        ? new Date().toISOString()
        : null
  }

  const { data, error } = await admin
    .from("feedback_submissions")
    .update(update)
    .eq("id", id)
    .select("id,status,admin_notes,resolved_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submission: data })
}

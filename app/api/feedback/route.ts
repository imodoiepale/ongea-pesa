import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ONGEA_ENV } from "@/lib/environment"

// User feedback and issue reports. RLS-bound throughout: a user files their own
// and reads their own, nothing else. Admin triage lives at /api/admin/feedback.

const submitFeedback = z.object({
  category: z.enum(["issue", "idea", "usage", "praise", "other"]),
  severity: z.enum(["blocking", "major", "minor"]).optional(),
  message: z.string().trim().min(3).max(4000),
  // Captured by the client, not typed by the user.
  route: z.string().trim().max(300).optional(),
  app_version: z.string().trim().max(60).optional(),
  amount: z.coerce.number().nonnegative().max(1_000_000).optional(),
  transaction_id: z.string().uuid().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("id,category,severity,message,status,created_at,resolved_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = submitFeedback.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please add a bit more detail", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  // Severity only means something for an issue. Storing it on a compliment
  // would make the triage queue lie about how many problems exist.
  const severity = body.category === "issue" ? (body.severity ?? "minor") : null

  const { data, error } = await supabase
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      category: body.category,
      severity,
      message: body.message,
      route: body.route ?? null,
      // Read server-side: a client-supplied UA is trivially spoofed, and this is
      // for debugging, not identity.
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      app_version: body.app_version ?? null,
      amount: body.amount ?? null,
      transaction_id: body.transaction_id ?? null,
      environment: ONGEA_ENV,
    })
    .select("id,created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submission: data }, { status: 201 })
}

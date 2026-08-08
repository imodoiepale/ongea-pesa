import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// Contributor-facing CRUD for Sheng training submissions.
// RLS-bound client throughout: contributors only ever touch their own rows.
// Follows the zod + `authenticated()` idiom of app/api/schedules/route.ts.

const createContribution = z.object({
  prompt_id: z.string().uuid().optional(),
  audio_path: z.string().trim().min(3).max(400),
  transcript: z.string().trim().min(1).max(2000),
  variety: z.enum(["sheng", "swahili", "mixed", "english"]).default("sheng"),
  duration_ms: z.coerce.number().int().positive().max(600_000).optional(),
  // The client must send this explicitly. There is no server-side default:
  // consent has to be a deliberate act, not something a request shape implies.
  consent: z.literal(true),
})

async function authenticated() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("sheng_contributions")
    .select("id,prompt_id,audio_path,transcript,variety,duration_ms,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createContribution.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid contribution", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { consent, ...fields } = parsed.data

  // Reject a path pointing at someone else's folder before it reaches the DB.
  if (!fields.audio_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "audio_path must be in your own folder" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("sheng_contributions")
    .insert({ ...fields, user_id: user.id, consent_at: new Date().toISOString() })
    .select("id,status,created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contribution: data }, { status: 201 })
}

// Consent is revocable: a contributor can withdraw a submission at any time,
// including after approval. The storage object goes with it.
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = new URL(request.url).searchParams.get("id")
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "A valid contribution id is required" }, { status: 400 })
  }

  const { data: row, error: readError } = await supabase
    .from("sheng_contributions")
    .select("audio_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabase
    .from("sheng_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Storage delete is RLS-scoped to the owner's folder by the bucket policy.
  // A failure here leaves an orphaned object, not a data leak, so it is logged
  // rather than failing the request the contributor already succeeded at.
  const { error: storageError } = await supabase.storage
    .from("sheng-training-audio")
    .remove([row.audio_path])
  if (storageError) {
    console.error("⚠️ Orphaned training audio after contribution delete:", storageError)
  }

  return new NextResponse(null, { status: 204 })
}

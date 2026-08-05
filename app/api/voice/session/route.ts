import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

function isMissingColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|could not find/i.test(error.message || "")))
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null) as { voice_session_id?: string } | null
  if (!body?.voice_session_id) {
    return NextResponse.json({ error: "voice_session_id is required" }, { status: 400 })
  }

  const admin = createServiceClient()
  let { data, error } = await admin
    .from("voice_sessions")
    .update({ started_at: new Date().toISOString(), status: "active", billing_error: null })
    .eq("id", body.voice_session_id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()

  if (isMissingColumn(error)) {
    const fallback = await admin
      .from("voice_sessions")
      .update({ status: "active" })
      .eq("id", body.voice_session_id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) {
    return NextResponse.json({ error: "Voice session was not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

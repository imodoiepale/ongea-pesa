import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const createSchedule = z.object({
  recipient_label: z.string().trim().min(2).max(120),
  destination: z.object({ type: z.enum(["phone", "paybill", "till", "contact"]), value: z.string().trim().min(3).max(120), account: z.string().trim().max(120).optional() }),
  amount: z.coerce.number().positive().max(1_000_000),
  frequency: z.enum(["once", "weekly", "monthly"]),
  next_run_at: z.string().datetime(),
  reminder_enabled: z.boolean().default(true),
})

const updateSchedule = z.object({
  id: z.string().uuid(),
  recipient_label: z.string().trim().min(2).max(120).optional(),
  destination: createSchedule.shape.destination.optional(),
  amount: z.coerce.number().positive().max(1_000_000).optional(),
  frequency: z.enum(["once", "weekly", "monthly"]).optional(),
  next_run_at: z.string().datetime().optional(),
  reminder_enabled: z.boolean().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
})

async function authenticated() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data, error } = await supabase.from("scheduled_payments").select("*").eq("user_id", user.id).order("next_run_at")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = createSchedule.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid schedule", issues: parsed.error.flatten() }, { status: 400 })
  const { data, error } = await supabase.from("scheduled_payments").insert({ ...parsed.data, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = updateSchedule.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid schedule", issues: parsed.error.flatten() }, { status: 400 })
  const { id, ...changes } = parsed.data
  const { data, error } = await supabase.from("scheduled_payments").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await authenticated()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid schedule id is required" }, { status: 400 })
  const { error } = await supabase.from("scheduled_payments").delete().eq("id", id).eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

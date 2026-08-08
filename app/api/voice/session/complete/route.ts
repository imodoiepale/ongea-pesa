import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { PLATFORM_FEE_RATE, platformFee } from "@/lib/transaction-fees"
import { getPlatformFeeRate } from "@/lib/services/platformSettings"
import { VOICE_RATE_PER_MINUTE, voiceUsageCharge } from "@/lib/voice-funding"
import { ONGEA_ENV } from "@/lib/environment"

function isMissingColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|could not find/i.test(error.message || "")))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null) as { voice_session_id?: string } | null
  if (!body?.voice_session_id) {
    return NextResponse.json({ error: "voice_session_id is required" }, { status: 400 })
  }

  const admin = createServiceClient()
  let { data: session, error: sessionError } = await admin
    .from("voice_sessions")
    .select("id,user_id,status,started_at,created_at,usage_transaction_id")
    .eq("id", body.voice_session_id)
    .eq("user_id", user.id)
    .maybeSingle()

  let enhancedBillingSchema = true
  if (isMissingColumn(sessionError)) {
    enhancedBillingSchema = false
    const fallback = await admin
      .from("voice_sessions")
      .select("id,user_id,status,created_at")
      .eq("id", body.voice_session_id)
      .eq("user_id", user.id)
      .maybeSingle()
    session = fallback.data as typeof session
    sessionError = fallback.error
  }

  if (sessionError || !session) {
    return NextResponse.json({ error: "Voice session was not found" }, { status: 404 })
  }
  if (enhancedBillingSchema && session.usage_transaction_id) {
    return NextResponse.json({ ok: true, already_completed: true, transaction_id: session.usage_transaction_id })
  }
  const { data: existingUsage } = await admin
    .from("transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "voice_usage")
    .contains("metadata", { voice_session_id: session.id })
    .maybeSingle()
  if (existingUsage || session.status === "completed") {
    return NextResponse.json({ ok: true, already_completed: true, transaction_id: existingUsage?.id || null })
  }

  const endedAt = new Date()
  const startedAt = new Date(session.started_at || session.created_at || endedAt)
  const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
  const requestedUsageAmount = voiceUsageCharge(durationSeconds)

  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .single()
  const available = Math.max(0, Number(profile?.wallet_balance || 0))
  const maximumUsageAmount = Math.floor((available / (1 + PLATFORM_FEE_RATE)) * 100) / 100
  const usageAmount = Math.min(requestedUsageAmount, maximumUsageAmount)
  // Live rate from platform_settings, so an admin fee change actually applies.
  const feeRate = await getPlatformFeeRate()
  const fee = platformFee(usageAmount, "voice_usage", feeRate)

  const enhancedSessionUpdate = {
    status: "completed",
    ended_at: endedAt.toISOString(),
    duration_seconds: durationSeconds,
    billed_minutes: durationSeconds / 60,
    rate_per_minute: VOICE_RATE_PER_MINUTE,
    billing_error: usageAmount < requestedUsageAmount ? "Session charge limited by available wallet balance" : null,
  }
  const { data: reserved, error: reserveError } = await admin
    .from("voice_sessions")
    .update(enhancedBillingSchema ? enhancedSessionUpdate : { status: "completed" })
    .eq("id", session.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle()

  // This error used to be discarded, which hid a total billing outage: the
  // status CHECK constraint did not allow 'completed', so the UPDATE failed
  // every time, `reserved` came back null, and the route reported success
  // without ever charging. Never swallow it again — a failed reservation is
  // not the same as an already-settled session.
  if (reserveError) {
    console.error("❌ Voice session reservation failed:", reserveError)
    return NextResponse.json(
      { error: "We couldn't settle the voice session", details: reserveError.message },
      { status: 500 },
    )
  }

  if (!reserved) {
    return NextResponse.json({ ok: true, already_completed: true })
  }

  if (usageAmount <= 0) {
    return NextResponse.json({ ok: true, charged: 0, balance: available })
  }

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      user_id: user.id,
      environment: ONGEA_ENV,
      type: "voice_usage",
      amount: usageAmount,
      platform_fee: fee,
      transaction_cost: 0,
      net_amount: usageAmount,
      status: "completed",
      description: "Ongea Pesa voice usage",
      voice_command_text: `Voice usage for ${durationSeconds} seconds`,
      metadata: {
        purpose: "voice_usage",
        voice_session_id: session.id,
        duration_seconds: durationSeconds,
        billed_minutes: durationSeconds / 60,
        rate_per_minute: VOICE_RATE_PER_MINUTE,
        billing_basis: "per_second",
      },
      completed_at: endedAt.toISOString(),
    })
    .select("id")
    .single()

  if (transactionError || !transaction) {
    await admin.from("voice_sessions").update(enhancedBillingSchema ? { status: "active", billing_error: transactionError?.message || "Billing failed" } : { status: "active" }).eq("id", session.id)
    return NextResponse.json({ error: "We couldn't record the voice charge" }, { status: 500 })
  }

  let appliedFee = fee
  if (enhancedBillingSchema) {
    await admin.from("voice_sessions").update({ usage_transaction_id: transaction.id }).eq("id", session.id)
  } else if (fee > 0) {
    // Compatibility for environments awaiting migration 028: the legacy balance
    // trigger debits only `amount`, so record the saved fee as a hidden ledger debit.
    // Once 028 is applied the main row's platform_fee is included directly instead.
    const { error: feeError } = await admin.from("transactions").insert({
      user_id: user.id,
      type: "platform_fee",
      amount: fee,
      platform_fee: 0,
      transaction_cost: 0,
      net_amount: fee,
      status: "completed",
      description: "Ongea Pesa service fee",
      metadata: { hidden: true, fee_parent_id: transaction.id, voice_session_id: session.id },
      completed_at: endedAt.toISOString(),
    })
    if (feeError) {
      console.error("Voice platform-fee ledger insert failed:", feeError)
      appliedFee = 0
      await admin.from("transactions").update({ platform_fee: 0 }).eq("id", transaction.id)
    }
  }
  const totalDebit = usageAmount + appliedFee
  return NextResponse.json({
    ok: true,
    transaction_id: transaction.id,
    duration_seconds: durationSeconds,
    usage_amount: usageAmount,
    platform_fee: appliedFee,
    total_debit: totalDebit,
    balance: Math.max(0, available - totalDebit),
  })
}

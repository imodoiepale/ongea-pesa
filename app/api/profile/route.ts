import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { VOICE_STARTER_AMOUNT } from "@/lib/voice-funding"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
const KENYAN_PHONE = /^(?:254|0)[17]\d{8}$/

// A missing column surfaces two different ways: Postgres raises 42703, but PostgREST
// rejects it earlier against its schema cache with PGRST204 ("Could not find the 'x'
// column of 'profiles' in the schema cache"). supabase-js goes through PostgREST, so
// PGRST204 is the case we actually hit when migration 024 hasn't run.
function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (error.code === "42703" || error.code === "PGRST204") return true
  return /column .* does not exist|could not find the '.*' column/i.test(error.message || "")
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("254")) return digits
  if (digits.startsWith("0")) return digits
  if (/^[17]\d{8}$/.test(digits)) return `0${digits}`
  return digits
}

async function ensureAvatarBucket() {
  const service = createServiceClient()
  const { data } = await service.storage.getBucket("avatars")
  if (data) return null

  const { error } = await service.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: AVATAR_TYPES,
  })

  if (error && !/already exists/i.test(error.message)) return error
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 })
  }

  const formData = await request.formData()
  const fullName = String(formData.get("full_name") || "").trim().replace(/\s+/g, " ")
  const phoneNumber = normalizePhone(String(formData.get("phone_number") || ""))
  const preferredLanguage = formData.get("preferred_language") === "sw" ? "sw" : "en"
  const avatar = formData.get("avatar")

  if (fullName.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 })
  }
  if (!KENYAN_PHONE.test(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid Kenyan phone number." }, { status: 400 })
  }
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES || !AVATAR_TYPES.includes(avatar.type)) {
      return NextResponse.json({ error: "We couldn’t prepare that photo. Choose another image and try again." }, { status: 400 })
    }
  }

  const service = createServiceClient()
  let avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null

  if (avatar instanceof File && avatar.size > 0) {
    const bucketError = await ensureAvatarBucket()
    if (bucketError) {
      console.error("Avatar bucket setup failed:", bucketError)
      return NextResponse.json({ error: "Photo uploads are temporarily unavailable. Please try again." }, { status: 503 })
    }

    const extension = avatar.type === "image/webp" ? "webp" : avatar.type === "image/png" ? "png" : "jpg"
    const path = `${user.id}/profile.${extension}`
    const buffer = Buffer.from(await avatar.arrayBuffer())
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, buffer, { contentType: avatar.type, upsert: true, cacheControl: "3600" })

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError)
      return NextResponse.json({ error: "We couldn’t upload your photo. Your details have not been lost—please retry." }, { status: 502 })
    }

    const publicUrl = service.storage.from("avatars").getPublicUrl(path).data.publicUrl
    avatarUrl = `${publicUrl}?v=${Date.now()}`
  }

  const completeProfile = {
    full_name: fullName,
    phone_number: phoneNumber,
    avatar_url: avatarUrl,
    preferred_language: preferredLanguage,
  }

  let { error: profileError } = await service
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        ...completeProfile,
      },
      { onConflict: "id" },
    )

  // Older environments may not have the onboarding columns yet. Keep the core
  // profile usable and mirror the richer data to auth metadata until migration 024 runs.
  if (isMissingColumnError(profileError)) {
    const fallback = await service
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, phone_number: phoneNumber },
        { onConflict: "id" },
      )
    profileError = fallback.error
  }

  if (profileError) {
    console.error("Profile save failed:", profileError)
    const message = profileError.code === "23505"
      ? "That phone number is already linked to another account."
      : "We couldn’t save your profile. Please try again."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { error: metadataError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      ...completeProfile,
      name: fullName,
      profile_created_at: new Date().toISOString(),
    },
  })

  if (metadataError) {
    console.error("Profile metadata save failed:", metadataError)
    return NextResponse.json({ error: "Your profile was partly saved. Please tap Continue once more." }, { status: 500 })
  }

  return NextResponse.json({
    profile: completeProfile,
    optimizedAvatar: avatar instanceof File && avatar.size > 0,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as {
    stage?: string
    score?: number
    device_biometrics_consent?: boolean
    transaction_id?: string
  } | null
  const service = createServiceClient()
  const now = new Date().toISOString()
  let databaseUpdate: Record<string, string | number | null>
  let metadataUpdate: Record<string, string | number | null>

  if (body?.stage === "voice-funding") {
    if (!body.transaction_id) {
      return NextResponse.json({ error: "A completed funding transaction is required." }, { status: 400 })
    }
    const { data: transaction, error: transactionError } = await service
      .from("transactions")
      .select("id, amount, status, type")
      .eq("id", body.transaction_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (
      transactionError ||
      !transaction ||
      transaction.type !== "deposit" ||
      transaction.status !== "completed" ||
      Number(transaction.amount) < VOICE_STARTER_AMOUNT
    ) {
      return NextResponse.json({ error: "Your KSh 200 payment has not been confirmed yet." }, { status: 409 })
    }

    databaseUpdate = {
      voice_funding_completed_at: now,
      voice_funding_transaction_id: transaction.id,
      voice_funding_amount: Number(transaction.amount),
    }
    metadataUpdate = databaseUpdate
  } else if (body?.stage === "voice-calibration") {
    const score = Math.round(Number(body.score))
    if (!Number.isFinite(score) || score < 40 || score > 100) {
      return NextResponse.json({ error: "Complete the voice check before continuing." }, { status: 400 })
    }
    databaseUpdate = { voice_calibration_score: score, voice_calibrated_at: now }
    metadataUpdate = databaseUpdate
  } else if (body?.stage === "onboarding-complete") {
    databaseUpdate = {
      onboarding_completed_at: now,
      device_biometrics_consent_at: body.device_biometrics_consent ? now : null,
    }
    metadataUpdate = databaseUpdate
  } else {
    return NextResponse.json({ error: "Unknown onboarding step." }, { status: 400 })
  }

  const { error: updateError } = await service.from("profiles").update(databaseUpdate).eq("id", user.id)
  const missingColumns = isMissingColumnError(updateError)
  if (updateError && !missingColumns) {
    console.error("Onboarding progress save failed:", updateError)
    return NextResponse.json({ error: "We couldn’t save your progress. Please try again." }, { status: 400 })
  }

  const { error: metadataError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...metadataUpdate },
  })
  if (metadataError) {
    console.error("Onboarding metadata save failed:", metadataError)
    return NextResponse.json({ error: "We couldn’t save your progress. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, persistedToProfile: !missingColumns })
}

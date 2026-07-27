import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const BUCKET = "voice-biometric-samples"
const MAX_AUDIO_BYTES = 2 * 1024 * 1024
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"])

function baseMime(type: string) {
  return type.toLowerCase().split(";")[0].trim()
}

function extensionFor(type: string) {
  return type === "audio/ogg" ? "ogg"
    : type === "audio/mp4" ? "m4a"
      : type === "audio/wav" ? "wav"
        : type === "audio/mpeg" ? "mp3"
          : "webm"
}

async function authenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user
}

async function ensureBucket() {
  const service = createServiceClient()
  const { data } = await service.storage.getBucket(BUCKET)
  if (data) return null
  const { error } = await service.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_AUDIO_BYTES,
    allowedMimeTypes: [...AUDIO_TYPES],
  })
  return error && !/already exists/i.test(error.message) ? error : null
}

export async function GET() {
  const user = await authenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile, error } = await service
    .from("profiles")
    .select("voice_biometric_sample_path, voice_biometric_enrolled_at, voice_biometric_consent_at")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    const fallbackPath = user.user_metadata?.voice_biometric_sample_path
    if (typeof fallbackPath !== "string") return NextResponse.json({ enrolled: false })
    const { data } = await service.storage.from(BUCKET).createSignedUrl(fallbackPath, 3600)
    return NextResponse.json({ enrolled: true, playbackUrl: data?.signedUrl || null })
  }

  if (!profile?.voice_biometric_sample_path) {
    return NextResponse.json({ enrolled: false })
  }

  const { data, error: signedUrlError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(profile.voice_biometric_sample_path, 3600)

  if (signedUrlError) {
    return NextResponse.json({ error: "Your voice sample is saved, but playback is temporarily unavailable." }, { status: 503 })
  }

  return NextResponse.json({
    enrolled: true,
    enrolledAt: profile.voice_biometric_enrolled_at,
    consentedAt: profile.voice_biometric_consent_at,
    playbackUrl: data.signedUrl,
  })
}

export async function POST(request: Request) {
  const user = await authenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 })
  }

  const formData = await request.formData()
  const consent = formData.get("consent") === "true"
  const sample = formData.get("sample")
  if (!consent) {
    return NextResponse.json({ error: "Consent is required before saving a voice reference." }, { status: 400 })
  }
  if (!(sample instanceof File) || sample.size === 0) {
    return NextResponse.json({ error: "Record your short voice phrase before continuing." }, { status: 400 })
  }

  const mime = baseMime(sample.type)
  if (!AUDIO_TYPES.has(mime) || sample.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "The voice sample must be a supported audio file under 2 MB." }, { status: 400 })
  }

  const bucketError = await ensureBucket()
  if (bucketError) {
    console.error("Voice biometric bucket setup failed:", bucketError)
    return NextResponse.json({ error: "Voice enrollment is temporarily unavailable." }, { status: 503 })
  }

  const service = createServiceClient()
  const path = `${user.id}/reference.${extensionFor(mime)}`
  const buffer = Buffer.from(await sample.arrayBuffer())
  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true, cacheControl: "0" })

  if (uploadError) {
    console.error("Voice sample upload failed:", uploadError)
    return NextResponse.json({ error: "We couldn’t save your voice sample. Please retry." }, { status: 502 })
  }

  const now = new Date().toISOString()
  const profileUpdate = {
    voice_biometric_consent_at: now,
    voice_biometric_enrolled_at: now,
    voice_biometric_sample_path: path,
  }
  const { error: profileError } = await service.from("profiles").update(profileUpdate).eq("id", user.id)
  if (profileError && profileError.code !== "PGRST204" && profileError.code !== "42703") {
    await service.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: "We couldn’t complete voice enrollment. Please retry." }, { status: 500 })
  }

  await service.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...profileUpdate },
  })

  const { data } = await service.storage.from(BUCKET).createSignedUrl(path, 3600)
  return NextResponse.json({ enrolled: true, playbackUrl: data?.signedUrl || null })
}

export async function DELETE() {
  const user = await authenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 })
  }

  const service = createServiceClient()
  const path = typeof user.user_metadata?.voice_biometric_sample_path === "string"
    ? user.user_metadata.voice_biometric_sample_path
    : `${user.id}/reference.webm`

  await service.storage.from(BUCKET).remove([path])
  await service.from("profiles").update({
    voice_biometric_sample_path: null,
    voice_biometric_enrolled_at: null,
  }).eq("id", user.id)
  await service.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      voice_biometric_sample_path: null,
      voice_biometric_enrolled_at: null,
    },
  })

  return NextResponse.json({ enrolled: false })
}

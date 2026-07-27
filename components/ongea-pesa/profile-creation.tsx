"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Camera, Check, ImageIcon, Loader2, Phone, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { formatImageSize, optimizeProfileImage } from "@/lib/image-optimizer"
import { OnboardingProgress } from "./onboarding-progress"

type Language = "en" | "sw"

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("254")) return `+${digits.slice(0, 12)}`
  if (digits.startsWith("0")) return digits.slice(0, 10)
  return digits.slice(0, 10)
}

export function ProfileCreationScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const previewUrlRef = useRef<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [language, setLanguage] = useState<Language>("en")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [imageNote, setImageNote] = useState("")
  const [optimizing, setOptimizing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.id) return

    const metadata = user.user_metadata || {}
    setName(typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : "")
    setPhone(typeof metadata.phone_number === "string" ? metadata.phone_number : "")
    setAvatar(typeof metadata.avatar_url === "string" ? metadata.avatar_url : null)
    if (metadata.preferred_language === "sw") setLanguage("sw")

    supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone_number) setPhone(data.phone_number)
      })
  }, [supabase, user])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setOptimizing(true)
    setError("")
    setImageNote("Preparing your photo…")

    try {
      const optimized = await optimizeProfileImage(file)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const previewUrl = URL.createObjectURL(optimized.file)
      previewUrlRef.current = previewUrl
      setAvatarFile(optimized.file)
      setAvatar(previewUrl)
      setImageNote(
        optimized.optimizedBytes < optimized.originalBytes
          ? `Optimized from ${formatImageSize(optimized.originalBytes)} to ${formatImageSize(optimized.optimizedBytes)}`
          : `Ready to upload · ${formatImageSize(optimized.optimizedBytes)}`,
      )
    } catch (reason) {
      setImageNote("")
      setError(reason instanceof Error ? reason.message : "We couldn’t prepare that photo. Please try another one.")
    } finally {
      setOptimizing(false)
    }
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.id) {
      setError("Your session expired. Sign in and try again.")
      return
    }

    const phoneDigits = phone.replace(/\D/g, "")
    if (name.trim().length < 2 || !/^(?:254|0)?[17]\d{8}$/.test(phoneDigits)) {
      setError("Enter your full name and a valid Kenyan phone number.")
      return
    }

    setBusy(true)
    setError("")

    try {
      const formData = new FormData()
      formData.set("full_name", name.trim())
      formData.set("phone_number", phone)
      formData.set("preferred_language", language)
      if (avatarFile) formData.set("avatar", avatarFile)

      const response = await fetch("/api/profile", { method: "POST", body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "We couldn’t save your profile. Please try again.")
      }

      await supabase.auth.refreshSession()
      router.push("/voice-calibration")
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t save your profile. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main-content" className="onboarding-page onboarding-page--light onboarding-profile">
      <form onSubmit={save} className="onboarding-frame profile-depth-shell">
        <header className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="profile-icon-button"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <OnboardingProgress step={1} />
          <span className="w-11" aria-hidden="true" />
        </header>

        <div className="profile-intro text-center">
          <h1 className="orbital-display profile-title">Make it yours</h1>
          <p>Tell us a little about you</p>
        </div>

        <div className="profile-photo-area">
          <label className="profile-avatar" aria-label="Choose a profile photo">
            <span className="profile-avatar__orbit profile-avatar__orbit--one" aria-hidden="true" />
            <span className="profile-avatar__orbit profile-avatar__orbit--two" aria-hidden="true" />
            <span className="profile-avatar__preview">
              {avatar ? (
                <img src={avatar} alt="Your selected profile photo" />
              ) : (
                <img src="/brand/orbital/profile-default.webp" alt="Fictional profile preview" />
              )}
            </span>
            <span className="profile-avatar__action" aria-hidden="true">
              {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
              className="sr-only"
              onChange={chooseAvatar}
              disabled={optimizing || busy}
            />
          </label>
          <p className={`profile-image-note ${imageNote ? "is-visible" : ""}`} aria-live="polite">
            {imageNote && (
              <>
                {optimizing ? <ImageIcon className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {imageNote}
              </>
            )}
          </p>
        </div>

        <div className="profile-fields">
          <label className="profile-field">
            <span>Full name</span>
            <span className="profile-field__control">
              <UserRound aria-hidden="true" />
              <input
                className="orbital-field orbital-field--with-icon"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="James Mwangi"
                disabled={busy}
              />
            </span>
          </label>

          <label className="profile-field">
            <span>Phone number</span>
            <span className="profile-field__control">
              <Phone aria-hidden="true" />
              <input
                className="orbital-field orbital-field--with-icon"
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                disabled={busy}
              />
            </span>
          </label>

          <fieldset className="profile-language">
            <legend>Preferred language</legend>
            <div>
              {(["en", "sw"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={language === code ? "is-selected" : ""}
                  aria-pressed={language === code}
                  disabled={busy}
                >
                  {code === "en" ? "English" : "Kiswahili"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="profile-submit-area">
          {error && <p role="alert" className="profile-error">{error}</p>}
          <button disabled={busy || optimizing} className="orbital-button profile-continue w-full">
            <span>{busy ? "Saving your profile…" : optimizing ? "Preparing photo…" : "Continue"}</span>
            {busy || optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </main>
  )
}

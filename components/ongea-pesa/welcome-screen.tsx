"use client"

import { useRouter } from "next/navigation"
import { AudioLines } from "lucide-react"
import { OngeaWordmark, VoiceCore } from "@/components/foundation"

export function WelcomeScreen() {
  const router = useRouter()

  return (
    <main id="main-content" className="onboarding-page onboarding-page--dark onboarding-welcome">
      <section className="onboarding-frame">
        <OngeaWordmark className="onboarding-welcome__brand" />
        <VoiceCore className="onboarding-welcome__orb" priority />

        <div className="onboarding-welcome__copy">
          <h1 className="orbital-display">
            Money,<br />made <span>natural.</span>
          </h1>
          <p>Speak, send and manage<br />money your way.</p>
        </div>

        <div className="onboarding-welcome__actions">
          <button onClick={() => router.push("/signup")} className="onboarding-primary onboarding-primary--mint">
            <AudioLines aria-hidden="true" />
            <span>Get started</span>
          </button>
          <button onClick={() => router.push("/login")} className="onboarding-text-action">
            I already have an account
          </button>
        </div>
      </section>
    </main>
  )
}

"use client"

import { ShieldCheck } from "lucide-react"
import { OngeaWordmark } from "@/components/foundation"

export default function AuthLayout({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "access" }) {
  if (variant === "access") {
    return (
      <main id="main-content" className="onboarding-page onboarding-page--light onboarding-access">
        <section className="onboarding-frame">
          <OngeaWordmark className="onboarding-access__brand" />
          <div className="onboarding-access__content">{children}</div>
          <p className="onboarding-access__secure">
            <ShieldCheck aria-hidden="true" />
            Your data is encrypted and secure
          </p>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="auth-shell orbital-page">
      <div className="auth-shell__grid">
        <section className="auth-shell__story" aria-label="Ongea Pesa">
          <OngeaWordmark />
          <div>
            <p className="orbital-label text-[hsl(var(--mint))]">Voice-first money</p>
            <h1 className="orbital-display">
              Money,<br />made <span>natural.</span>
            </h1>
            <p>Speak, send and manage money your way.</p>
          </div>
        </section>

        <section className="auth-shell__form">
          <OngeaWordmark className="auth-shell__mobile-brand" />
          <div className="auth-shell__surface">{children}</div>
          <p className="auth-shell__secure">
            <ShieldCheck aria-hidden="true" />
            Your data is encrypted and secure
          </p>
        </section>
      </div>
    </main>
  )
}

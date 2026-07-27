"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import { OrbitalRouteBackdrop } from "@/components/foundation"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <OrbitalRouteBackdrop />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

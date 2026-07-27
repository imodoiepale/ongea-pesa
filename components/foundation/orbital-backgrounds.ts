export type OrbitalBackdropScene =
  | "auth"
  | "voice"
  | "transfer"
  | "wallet"
  | "scanner"
  | "chama"
  | "escrow"
  | "planning"
  | "trust"

export type OrbitalBackdropAsset = {
  avif: string
  webp: string
}

export type OrbitalBackdropDefinition = {
  light: OrbitalBackdropAsset
  dark: OrbitalBackdropAsset
  fallback: string
  width: 1080
  height: 1920
  focalPosition: string
  lightScrim: number
  darkScrim: number
  priority: boolean
}

const asset = (scene: OrbitalBackdropScene, theme: "light" | "dark"): OrbitalBackdropAsset => ({
  avif: `/brand/orbital/backgrounds/${scene}-${theme}.avif`,
  webp: `/brand/orbital/backgrounds/${scene}-${theme}.webp`,
})

export const orbitalBackgrounds: Record<OrbitalBackdropScene, OrbitalBackdropDefinition> = {
  auth: {
    light: asset("auth", "light"),
    dark: asset("auth", "dark"),
    fallback: asset("auth", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.08,
    darkScrim: 0.14,
    priority: true,
  },
  voice: {
    light: asset("voice", "light"),
    dark: asset("voice", "dark"),
    fallback: asset("voice", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.12,
    darkScrim: 0.16,
    priority: true,
  },
  transfer: {
    light: asset("transfer", "light"),
    dark: asset("transfer", "dark"),
    fallback: asset("transfer", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.12,
    darkScrim: 0.18,
    priority: false,
  },
  wallet: {
    light: asset("wallet", "light"),
    dark: asset("wallet", "dark"),
    fallback: asset("wallet", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 48%",
    lightScrim: 0.2,
    darkScrim: 0.2,
    priority: false,
  },
  scanner: {
    light: asset("scanner", "light"),
    dark: asset("scanner", "dark"),
    fallback: asset("scanner", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.05,
    darkScrim: 0.08,
    priority: false,
  },
  chama: {
    light: asset("chama", "light"),
    dark: asset("chama", "dark"),
    fallback: asset("chama", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.16,
    darkScrim: 0.2,
    priority: false,
  },
  escrow: {
    light: asset("escrow", "light"),
    dark: asset("escrow", "dark"),
    fallback: asset("escrow", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 42%",
    lightScrim: 0.16,
    darkScrim: 0.2,
    priority: false,
  },
  planning: {
    light: asset("planning", "light"),
    dark: asset("planning", "dark"),
    fallback: asset("planning", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.2,
    darkScrim: 0.22,
    priority: false,
  },
  trust: {
    light: asset("trust", "light"),
    dark: asset("trust", "dark"),
    fallback: asset("trust", "dark").webp,
    width: 1080,
    height: 1920,
    focalPosition: "50% 50%",
    lightScrim: 0.18,
    darkScrim: 0.22,
    priority: false,
  },
}

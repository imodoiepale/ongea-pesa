import type { Metadata, Viewport } from "next"
import { Bodoni_Moda, Inter, JetBrains_Mono, Sora } from "next/font/google"
import "./globals.css"
// Motion + surface system ported from DepthMe. Loaded after globals.css so its
// tokens can reference --teal/--abyss/--deep-sea defined there.
import "./motion-system.css"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" })
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "Ongea Pesa — Voice-Activated M-Pesa",
  description:
    "Kenya's fastest voice-activated M-Pesa assistant. Pay bills, send money, and manage finances with just your voice.",
  applicationName: "Ongea Pesa",
  appleWebApp: {
    capable: true,
    title: "Ongea Pesa",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: "https://ongeapesa.nsait.co.ke",
    siteName: "Ongea Pesa",
    title: "Ongea Pesa — Voice-Activated M-Pesa",
    description:
      "Kenya's fastest voice-activated M-Pesa assistant. Pay bills, send money, and manage finances with just your voice.",
    images: [
      {
        url: "https://ongeapesa.nsait.co.ke/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Ongea Pesa — Voice-Activated M-Pesa Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ongea Pesa — Voice-Activated M-Pesa",
    description: "Kenya's fastest voice-activated M-Pesa assistant",
    images: ["https://ongeapesa.nsait.co.ke/icons/icon-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32x32.png",
    apple: [
      { url: "/icons/icon-192x192.png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
      { url: "/icons/icon-180x180.png", sizes: "180x180" },
      { url: "/icons/icon-167x167.png", sizes: "167x167" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // user-scalable removed — accessibility requirement (pinch-zoom must work)
  viewportFit: "cover",
  // Match the actual page surfaces so browser chrome never shows a
  // mismatched strip (was brand green).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1417" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${bodoni.variable} ${mono.variable}`} suppressHydrationWarning>
      {/* Apple splash screens — kept as raw links (no Metadata API equivalent) */}
      <head>
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-2048-2732.png"
          media="(device-width:1024px) and (device-height:1366px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668-2388.png"
          media="(device-width:834px) and (device-height:1194px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1536-2048.png"
          media="(device-width:768px) and (device-height:1024px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125-2436.png"
          media="(device-width:375px) and (device-height:812px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242-2688.png"
          media="(device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828-1792.png"
          media="(device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170-2532.png"
          media="(device-width:390px) and (device-height:844px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1179-2556.png"
          media="(device-width:393px) and (device-height:852px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)"
        />
      </head>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}

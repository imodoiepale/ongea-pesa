# 01 · Logo System

**Direction (chosen 2026-06-30):** Light glassmorphic premium fintech — soft pearl-white background,
deep-navy wordmark, electric-cyan + neon-mint glass orb, sparing warm-gold accent.
*(This supersedes the earlier dark-teal v1. The dark renders in `05_Generated/logos/` are kept as `_superseded` reference only.)*

Five refined variations — each is a **decluttered, render-safe** version of one of the five concepts you provided.
The originals stacked too many elements (currency particles + money paths + arrows + mic + waveform + 3 rings),
which is what produced mushy output. Each prompt here keeps **ONE central device** + a waveform + max two rings.

| # | Variation (your name) | File | Device | Primary use |
|---|---|---|---|---|
| 1 | **Orbital Voice Money Core** | `prompts/01_primary_lockup.json` | Glass orb + waveform + mint core + 2 rings | Hero / primary lockup |
| 2 | **Voice Wave Transaction Halo** | `prompts/02_app_icon.json` | Waveform curved into a halo orbit | App icon / favicon (cleanest) |
| 3 | **African AI Mobile Money Orb** | `prompts/03_horizontal_lockup.json` | Orb w/ subtle voice-button core | Header / nav / merch breast |
| 4 | **Glassmorphic Payment Sphere** | `prompts/04_monochrome.json` | Glass sphere + cyan→gold waveform | Luxury hero / app store |
| 5 | **Voice Command Payment Portal** | `prompts/05_premium_gradient.json` | Waveform-formed portal ring | Landing / pitch / Safaricom demo |

Plus `prompts/00_logo_board.json` — a 2×3 contact sheet of all five for approval.

## Palette (locked → see `00_Brand_Foundation/brand-tokens.json`)
- Electric Cyan `#70D0E0` · Neon Mint `#69CEA9` · Soft Aqua `#A9D3DF`
- Deep Navy `#2A5D73` (wordmark) · Pearl White `#DDE8ED` (bg) · Warm Gold `#F4DFA0` (accent)

## Generation notes
- **Model:** `nano_banana_pro` @ 2K, **text-to-image (no dark reference)** — the old dark icon fights the new light background.
- Generate 2–3 seeds for #1 and #2; pick the cleanest.
- **One-idea rule:** never re-add currency particles / arrows / literal microphone — that is the bogus-render trigger.

## Favicon / app-icon export (from variation 2 once approved)
`16, 32, 48, 72, 96, 128, 144, 152, 192, 256, 384, 512` px PNG + maskable safe-zone + monochrome SVG → replaces `public/icons/`.

# Ongea Pesa — Product Launch Brand Kit

**Prepared for:** Ongea Pesa launch · by **NSAIT** (Nairobi Space of AI Tools)
**Date:** 2026-06-30
**Source mark:** `public/icons/icon-512x512.png` — glowing teal/cyan/green orbital "atom" + soundwave (the voice metaphor) with **ONGEA PESA** wordmark.

> **Ongea** = "speak" in Swahili. **Pesa** = "money". Ongea Pesa = *Speak. Send. Done.* — a voice-first Kenyan fintech.

---

## What's in this kit

| Folder | Contents |
|---|---|
| `00_Brand_Foundation/` | The single source of truth — brand strategy, color tokens, typography, logo rules, voice & tone, NSAIT endorsement lockup. **Read this first.** |
| `01_Logo_System/` | 5 refined logo variations + JSON generation prompts + favicon/app-icon spec. |
| `02_Apparel/` | Polo (collared) shirt + hoodie designs. Front breast lockup, full back print, print-ready specs + JSON prompts. |
| `03_Social_Launch/` | Launch-announcement posts, profile/cover images, story templates, "We're live" banners (X / Instagram / LinkedIn). |
| `04_Brand_Board/` | One premium brand-guidelines board + business card, sticker sheet, app-store screenshot frames. |
| `05_Generated/` | All rendered PNG outputs, organized by type. |

---

## How to use the JSON prompts

Every `prompts/*.json` file is a **self-contained, model-ready prompt** designed for premium image generators
(Higgsfield, Nano-Banana / Gemini image, Seedream, Flux, Ideogram, Midjourney). Each contains:

- `prompt` — the full natural-language render instruction (paste this directly)
- `negative_prompt` — what to suppress
- `params` — aspect ratio, model hint, guidance, references
- `brand_lock` — the non-negotiable color/typography/spacing constraints
- `notes` — art-direction reasoning + variation guidance

**Rule:** the `brand_lock` block in every prompt MUST match `00_Brand_Foundation/brand-tokens.json`.
If you change a color or font, change it there first, then propagate.

---

## Generation order (recommended)

1. **Logos first** (`01_Logo_System`) — lock the hero mark before anything else.
2. **Brand board** (`04_Brand_Board`) — proves the system holds together.
3. **Apparel** (`02_Apparel`) — uses the locked logo on the breast + NSAIT on back.
4. **Social** (`03_Social_Launch`) — last, because it reuses approved logo + lockups.

---

## The one-line brand promise

> **Ongea Pesa — Speak. Send. Done.**
> Powered by your voice. Built in Nairobi by NSAIT.

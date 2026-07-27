# 02 · Apparel — Polo (Collared) Shirts & Hoodies

Launch-team merch. Two garments, consistent placement.

## Placement map (both garments)

```
FRONT                                   BACK
┌─────────────────────┐                 ┌─────────────────────┐
│  ◉ Ongea Pesa        │                 │                     │
│  (emblem + wordmark) │                 │     ◉  ONGEA PESA    │  ← large, unique
│  — by NSAIT —        │  ← left breast  │   (custom wide font)│     display font
│                      │                 │                     │
│                      │                 │  by Nairobi Space   │
│                      │                 │   of AI Tools · NSAIT│
└─────────────────────┘                 └─────────────────────┘
```

- **Front, left breast:** the Ongea Pesa emblem + small **ONGEA PESA** wordmark, and directly **below it the NSAIT maker mark** ("the inside logo"). Small, refined, embroidered.
- **Back, centered upper:** large **ONGEA PESA** in the **custom unique display font** (see `prompts/00_unique_font_study.json`), with the emblem above or inline, and beneath it the line **"by Nairobi Space of AI Tools · NSAIT"**.

## The "unique font"
A bespoke wide, athletic, slightly-extended uppercase treatment of **ONGEA PESA** — tall caps, a custom ligature/cut on the "O" that echoes the orbital mark, a subtle soundwave underline. Defined in `prompts/00_unique_font_study.json`. Use it ONLY for the big back print and hero merch — not for UI.

## Garment colors
| Garment | Body | Print/embroidery |
|---|---|---|
| Polo | Abyss Ink black `#0A1A1F` **or** Mist white `#E6F7F5` | Teal/cyan emblem; white or ink wordmark for contrast |
| Hoodie | Abyss Ink black (primary) | Full-color emblem, white wordmark, signature gradient back print |

## Print-ready specs → see `print-specs.md`

## Prompt files
| File | What it renders |
|---|---|
| `prompts/00_unique_font_study.json` | The custom ONGEA PESA display-font specimen. |
| `prompts/01_polo_front.json` | Polo, left-breast lockup (Ongea + NSAIT). |
| `prompts/02_polo_back.json` | Polo, back wordmark + endorsement. |
| `prompts/03_hoodie_front.json` | Hoodie, breast lockup. |
| `prompts/04_hoodie_back.json` | Hoodie, large back print in unique font. |
| `prompts/05_apparel_board.json` | Premium flat-lay mockup board of the full collection. |

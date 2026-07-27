# Generation Log & Resume Queue

**Generator:** Higgsfield · model `nano_banana_pro` (2K).
**Plan note:** Higgsfield **Plus** has a **daily job limit** (separate from credit balance, ~453 credits remain). Hit on 2026-06-30. Resume when the daily limit resets, or upgrade the plan to lift the cap.

---

## 🔄 DIRECTION CHANGE (2026-06-30)

User reviewed the first 5 dark-teal renders and rejected the **dark direction**. New chosen direction = **light glassmorphic**:
pearl-white background `#DDE8ED`, deep-navy wordmark `#2A5D73`, electric-cyan `#70D0E0` + neon-mint `#69CEA9` glass orb, soft-aqua `#A9D3DF`, sparing warm-gold accent `#F4DFA0`.

The 5 dark renders are kept as `*_superseded_dark.png` for reference only. All logo prompts in `01_Logo_System/prompts/` have been rewritten to the new direction and **decluttered** (one central device each — the original 5 prompts stacked too many elements and rendered mushy).

---

## ⏳ Queue — generate the moment the daily limit resets

**Logos (NEW light/gold direction — generate first, text-to-image, NO dark reference):**
- [ ] `logos/01_orbital_voice_money_core.png` ← `01_Logo_System/prompts/01_primary_lockup.json` (2-3 seeds)
- [ ] `logos/02_voice_wave_halo.png` ← `01_Logo_System/prompts/02_app_icon.json` (2-3 seeds)
- [ ] `logos/03_african_ai_money_orb.png` ← `01_Logo_System/prompts/03_horizontal_lockup.json`
- [ ] `logos/04_glassmorphic_sphere.png` ← `01_Logo_System/prompts/04_monochrome.json`
- [ ] `logos/05_voice_command_portal.png` ← `01_Logo_System/prompts/05_premium_gradient.json`
- [ ] `logos/00_logo_board.png` ← `01_Logo_System/prompts/00_logo_board.json`

**Then, AFTER a logo is approved — re-palettize & generate the rest (currently still written in the old dark palette; update to light/gold first):**
- [ ] Apparel: polo front/back, hoodie front/back, apparel board, unique-font study
- [ ] Social: announcement, avatar, cover, story, feature teaser
- [ ] Brand board: brand board, business card, sticker sheet, appstore frames

---

## Resume recipe
1. Generate each queued logo with `nano_banana_pro`, 2K, aspect_ratio + prompt from its JSON. **No media reference** (light bg).
2. Download `results.rawUrl` into `05_Generated/logos/`.
3. User picks the winner → then re-palettize apparel/social/brand-board prompts to the light/gold tokens and generate those.
4. App-icon export: resize the approved icon to the 12 PWA sizes, replace `public/icons/` (ask before overwriting).

## Superseded (dark v1 — reference only)
`logos/0{1,2,3,5}_*_superseded_dark.png`, `apparel/00_unique_font_study_superseded_dark.png`

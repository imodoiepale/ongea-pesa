# 09 · Voice + Face Biometrics Integration Roadmap

## Where we are (actual codebase state)

- **Face/Touch ID: DONE** via WebAuthn passkeys (`@simplewebauthn`, `webauthn_credentials` table, `/api/security/passkey/*`). The device does the biometric match; we store only public keys. This is the right architecture — keep it.
- **Voice: identity ≠ biometrics yet.** Voice sessions are bound to the authenticated user, but the *speaker* is not verified — anyone holding an unlocked phone mid-session could speak a transaction. Step-up (PIN/passkey) currently bridges this gap.

## Target security model

Layered, per transaction risk:

| Risk tier | Example | Gate |
|---|---|---|
| Read | balance query | session auth |
| Low | send ≤ KES 1,000 to saved contact | session + **passive voice verification** (speaker match on the command utterance itself) |
| Medium | send > KES 1,000 / new recipient | + step-up: passkey (face) OR active voice challenge phrase |
| High | withdraw, gate transfer, limit change | passkey + voice, both |

Key principle for blind users: **voice must be a full standalone step-up path** — passkey/Face ID prompts are visual-flow-friendly, but the eyes-free path must never dead-end.

## Phase 1 (2–4 wks) — Foundations, no new vendors

1. Finish **voice-flow step-up end-to-end** (stage→confirm across n8n + client) — already planned; prerequisite for everything.
2. Add **spoken confirmation UX**: app reads back parsed transaction; explicit "ndiyo" confirm; log utterance hash + confidence in `voice_sessions`.
3. ODPC groundwork: consent flow for voice-print enrollment (explicit, revocable, audio-presented), DPIA drafted (doc 07 Phase 4). **Do not enroll voice prints before DPIA + consent ship.**

## Phase 2 (4–10 wks) — Speaker verification pilot

Vendor shortlist (evaluate on: Swahili/accent performance, anti-spoofing/liveness vs. TTS clones, on-prem/region hosting for DPA compliance, price):

- **Mitek / ID R&D (IDLive Voice)** — strong liveness/anti-deepfake; API-friendly.
- **Veridas** — top NIST results; voice + face in one vendor.
- **ValidSoft** — deepfake detection focus.
- **Open-source baseline:** SpeechBrain / NVIDIA TitaNet ECAPA-TDNN embeddings self-hosted (EU/African region server) — cheapest, full data control, more engineering. Good for pilot A/B against a commercial API.
- Note: ElevenLabs is our TTS/agent layer, not a speaker-verification product — verification is a separate service in the pipeline.

Architecture:

```
Mic → utterance → [1] STT/agent (ElevenLabs→n8n, existing)
                → [2] speaker-embedding service → cosine match vs enrolled voiceprint
                → [3] liveness/anti-spoof score
[2]+[3] → risk engine (new lib/services/voiceAuthService.ts) → allow / step-up / deny
```

- Store **embeddings (vectors), never raw enrollment audio** long-term; encrypt at rest; new table `voice_prints` (RLS, user-owned) + `voice_auth_events` audit.
- Enrollment: 3 short phrases at onboarding, guided by voice; re-enrollment path after illness/voice change; fallback always available (PIN).

## Phase 3 (10–16 wks) — Risk engine + anti-fraud

- Combine voice-match score, liveness, device fingerprint, amount, recipient novelty, time-of-day → single risk score gating the tier table above.
- Deepfake red-team: test with cloned voices of enrolled users (consented testers); tune thresholds. This is also the marketing "Twin Test"/bounty content (docs 02–03) — engineering and marketing share the artifact.
- Failure UX: degrade gracefully to passkey/PIN with a spoken explanation, never a silent visual error.

## Compliance guardrails (hard requirements)

1. Voice prints + face templates = sensitive personal data (DPA 2019): explicit consent, DPIA pre-launch, retention/deletion policy, ODPC registration current.
2. WebAuthn stays device-side — never centralize face data. Market this loudly: "your face never leaves your phone."
3. Deletion: "futa sauti yangu" (delete my voiceprint) must work by voice, end-to-end, and be audited.

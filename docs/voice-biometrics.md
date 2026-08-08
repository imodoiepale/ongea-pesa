# Voice biometrics — personalisation only

**Status: specified, not built.**

## The decision, up front

Voiceprints are used for **convenience only**. They personalise a greeting and
can pick the right profile on a shared device. They never authorise a payment,
never become a `StepupMethod`, and never substitute for the PIN or passkey.

This was a deliberate choice, and it is the right one. Voice cloning from a few
seconds of audio is a solved, commoditised problem — the same Fish Audio S2
capability this app uses for TTS clones a voice from 10–30 seconds of reference
audio. A factor that an attacker can synthesise from a WhatsApp voice note is not
a factor that should move money. Treating it as one in a Kenyan fintech would be
a straightforwardly bad trade: marginal convenience against catastrophic,
irreversible loss.

The existing security model stays exactly as it is: PIN (`profiles.pin_hash`) or
passkey (`webauthn_credentials`) issues a short-lived token from
`stepup_tokens`, and `/api/wallet/send`, `/api/wallet/withdraw` and
`/api/voice/confirm/[id]` consume it. Nothing in this document changes that.

## What already exists

`app/api/security/voice-biometric/route.ts` and the onboarding step in
`components/ongea-pesa/voice-calibration.tsx` implement **enrollment only**:

- Records a 5.2-second sample, computes a cosmetic RMS "score" that gates nothing.
- Uploads to the private `voice-biometric-samples` bucket at
  `{user.id}/reference.{ext}`, `upsert: true` — one sample per user.
- Writes `profiles.voice_biometric_consent_at` / `_enrolled_at` / `_sample_path`.

**There is no matching, embedding, scoring, or verification anywhere.** The
sample is write-and-playback only.

### Two defects to fix first

1. **The read path has no folder guard.** Compare `app/api/receipts/upload`,
   which explicitly does `if (!path.startsWith(\`${user.id}/\`)) return 403`.
   The voice-biometric GET has no equivalent — it trusts
   `profiles.voice_biometric_sample_path` implicitly. Add the same check.
2. **The bucket is created lazily at request time** by `ensureBucket()` rather
   than in a migration, and migration 026's storage policies cover it only
   because they were added separately. Verify the four owner policies are
   actually present before relying on RLS here.

Fix both before building anything on top.

## Design, if you build it

**Embeddings, not audio comparison.** Use ECAPA-TDNN (SpeechBrain
`spkrec-ecapa-voxceleb`) to reduce each sample to a 192-dim vector. Compare with
cosine similarity. Store the *embedding*, not just the audio — then a re-verify
does not require re-downloading and re-processing the reference clip.

Run it on the Hostinger VPS alongside the LiveKit worker; it is small and CPU
inference is fast enough for a one-shot check at session start.

```
POST /verify   { user_id, audio }  ->  { similarity: 0.0-1.0 }
```

Suggested threshold ~0.75 cosine, but **calibrate against your own enrollments**
rather than trusting a paper's number — thresholds do not transfer across
recording conditions, and Kenyan phone audio is not VoxCeleb.

**Enrollment needs more than one sample.** A single 5.2s clip in one acoustic
environment produces a brittle reference. Take three, in whatever conditions the
user is actually in, and average the embeddings.

## Where it is allowed to be used

Permitted:

- Greeting by name at session start.
- Picking the right profile on a shared handset.
- A **passive risk signal**: log a low-similarity session to `security_events`
  for review. Observing is not authorising.

Forbidden — enforce these in review, not just in prose:

- Adding `'voice'` to the `StepupMethod` union in
  `lib/services/securityService.ts:10`.
- Any call to `issueStepupToken` on the basis of a voice match.
- Any code path where a similarity score can reduce, skip, or replace a PIN or
  passkey prompt, for any amount, including small ones.

## Consent and data protection

Voiceprints are biometric personal data under Kenya's Data Protection Act 2019.
Practical minimum:

- Explicit, separate consent — already implemented (`consent === "true"` is
  required by the POST handler). Keep it.
- Purpose limitation stated to the user: personalisation, not authorisation.
  Say this plainly in the onboarding copy, because users will otherwise assume
  their voice is protecting their money, and behave accordingly.
- Deletion on request — the DELETE handler exists; make sure it also removes any
  stored embedding, not just the audio object.
- Retention limit. Nothing currently expires these samples.

Note the contrast that already exists in this codebase and is worth preserving:
passkeys keep face and fingerprint matching **inside the user's device**, and the
server stores only a public key. Voice is the one biometric where raw material
lands on your servers. That asymmetry is a good reason to keep its privileges low.

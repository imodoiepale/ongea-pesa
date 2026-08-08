# Natural listening — wake word, VAD, barge-in

**Status: specified, not built.** How to make the assistant feel like Siri
rather than a walkie-talkie.

## Start here: what the app already has

Worth knowing before you buy or build anything.

| Capability | State |
|---|---|
| Porcupine wake word | **Dependencies already installed** — `@picovoice/porcupine-react`, `porcupine-web`, `web-voice-processor` are in `package.json` and used by nothing |
| Web Speech wake word | Two implementations exist: `hooks/use-web-speech-wake-word.ts` (orphaned) and `hooks/use-voice-activation.ts` (used only by the scanner) |
| VAD | None. No Silero, no `@ricky0123/vad`, nothing |
| Barge-in | None in app code — whatever `@elevenlabs/react` does internally |
| Push-to-talk | Removed. `voice-interface.tsx:36` still declares `isPushToTalk` but every handler is a no-op |
| Silence timeout | Deliberately disabled — `resetInactivityTimer` begins with a bare `return` |

So the wake-word work starts much further along than it looks, and the
Web Speech implementations should be **deleted**, not extended: they depend on
`webkitSpeechRecognition`, which ships audio to Google, dies on iOS Safari, and
cannot run alongside an active WebRTC session.

## The three layers, and why they are different problems

These get conflated constantly. They are not the same thing:

1. **Wake word** — "is the user addressing me at all?" Runs continuously, must be
   cheap and fully on-device. Porcupine.
2. **VAD** — "is anyone speaking right now?" Frame-level energy/model decision.
   Drives barge-in. Silero.
3. **Turn detection** — "have they *finished* speaking?" Semantic, not acoustic.
   A pause after "send five hundred to…" is not the end of a turn. This is what
   makes an agent stop interrupting people.

Using VAD alone for #3 is the single most common cause of an agent that feels
rude, because it cuts in on every natural pause.

## Layer 1 — wake word (client)

Create a custom "Ongea Pesa" keyword in the Picovoice console (free tier covers
this), download the `.ppn` for `wasm`, and drop it in `public/`.

```tsx
import { usePorcupine } from "@picovoice/porcupine-react"

const { keywordDetection, init, start, stop } = usePorcupine()

await init(
  process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY!,
  [{ publicPath: "/ongea-pesa.ppn", label: "ongea-pesa" }],
  { publicPath: "/porcupine_params.pv" },
)
await start()
```

Wire `keywordDetection` to `startElevenLabsSession()` in
`contexts/ElevenLabsContext.tsx`.

**Battery and consent.** Continuous mic access drains battery and is a real
privacy claim. Make wake word opt-in in settings, show a persistent indicator
while it is armed, and stop it whenever a session is active — Porcupine and the
session should never hold the mic simultaneously.

## Layer 2 and 3 — VAD and turn detection (agent side)

Already configured in `voice-agent/agent.py`:

```python
vad=silero.VAD.load(),
turn_detection=MultilingualModel(),
```

Silero handles presence and interruption; the [LiveKit turn detector](https://huggingface.co/livekit/turn-detector)
is an open-weights model that predicts end-of-utterance from the semantic
content of what has been transcribed so far, and dynamically stretches or
shortens the VAD silence timeout accordingly.

Both are defaults, not Kenyan-tuned. Expect to adjust `min_silence_duration`
once you have real recordings — Kiswahili and Sheng have different natural pause
lengths than the English these models were tuned on.

**This is LiveKit-only.** The ElevenLabs path does not expose these hooks, which
is a substantive reason to run the LiveKit engine even before its latency is
better.

## The constraint nobody can engineer around

**A backgrounded mobile PWA cannot keep listening.** When the user switches apps
or locks the phone, the page is suspended: `getUserMedia` stops delivering and
the WebRTC connection dies. There is no service-worker API that restores this —
`public/sw.js` handles push, notificationclick and sync, and none of those can
hold a mic.

Practical consequences:

- "Hey Ongea" only works with the app open and foregrounded. Say so in the UI
  rather than letting users discover it.
- True always-on requires a native shell (Capacitor/React Native with a
  foreground service on Android, and on iOS it is effectively not possible for
  third-party apps).
- **There is a live bug here already**: when a tab is killed mid-session,
  `settleVoiceSession` never fires, leaving the session `active` and unbilled.
  27 such rows exist right now. This needs a sweeper modelled on
  `app/api/ncba/stk-sweep/route.ts` that expires stale `active` sessions and
  bills them from `started_at`. Fix that before adding anything that makes
  sessions longer or more frequent.

## Suggested order

1. Delete the two Web Speech wake-word hooks and the dead `isPushToTalk` state.
2. Build the stale-session sweeper. Unbilled sessions are a revenue leak today.
3. Porcupine wake word, opt-in, foreground-only, with a visible indicator.
4. Tune Silero and the turn detector against real recordings.

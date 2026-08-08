# Ongea Pesa — LiveKit + Fish Audio voice worker

A second voice runtime that runs **in parallel** with the existing ElevenLabs
agent. It is opt-in per user, admin-only, and shares the exact money path.

## Why it is a separate service

Vercel serverless functions cannot hold a long-lived audio session. The worker
is a persistent process that joins LiveKit rooms — it belongs on your Hostinger
VPS, not in the Next.js deployment.

## How it fits together

```
browser  ──POST /api/voice/livekit-token──▶  Next.js (Vercel)
   │                                            │ checks profiles.voice_engine = 'livekit'
   │                                            │ opens voice_sessions row
   │        ◀── token + room + wss url ─────────┘
   │
   └──WebRTC──▶  LiveKit Cloud  ◀──WebRTC──  voice-agent (Hostinger VPS)
                                                  │
                                                  └──POST /api/voice/webhook──▶ Next.js ──▶ n8n
```

The last hop is the important one: **the worker never talks to n8n, Supabase or
NCBA directly.** It posts to the same `/api/voice/webhook` the ElevenLabs agent
uses, so fee calculation, the free-transaction rule, step-up staging and rail
routing are computed in exactly one place. If the worker reimplemented any of
that, the two engines would eventually disagree and one would be wrong.

## Smoke test FIRST — do not skip this

The `livekit-agents` API changed shape across the 1.x line. This file is pinned
to `>=1.6,<2` but the surface must be **verified against what actually installs**,
not assumed. Run this immediately after `pip install`:

```bash
source .venv/bin/activate
python - <<'PY'
from livekit.plugins import fishaudio, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
import livekit.agents as agents

print("agents:", agents.__version__)
print("fishaudio exports:", [n for n in dir(fishaudio) if n.isupper() or n[0].isupper()])
assert not hasattr(fishaudio, "STT"), "fishaudio unexpectedly has STT — update build_stt()"
print("AgentSession:", hasattr(agents, "AgentSession"))
print("OK")
PY
```

Then check the agent itself imports and registers:

```bash
python agent.py download-files   # pulls Silero VAD + turn-detector weights
python agent.py dev              # connects to LiveKit, waits for a room
```

If `python agent.py dev` raises on `AgentSession(...)`, `WorkerOptions`, or an
event name, the installed API differs from this file. Read the traceback and the
docs for **your** installed version at
<https://docs.livekit.io/agents/> before changing anything else — a worker that
starts but mis-wires a tool is worse than one that fails loudly.

## What Fish Audio does and does not do

Fish Audio is the **voice** — TTS and voice cloning. It does not solve Sheng.

**There is no `fishaudio.STT`.** The plugin is TTS-only (confirmed against
`livekit-plugins-fishaudio` 1.6.9). Speech recognition comes from Deepgram by
default — `nova-3` with `language="multi"`, which is what handles code-switching
rather than locking to one language mid-sentence.

Sheng comprehension is a **speech recognition** problem, and no commercial STT
handles Kenyan code-switching well. That is what the `/training` page collects a
corpus for, and what `docs/sheng-asr-finetuning.md` turns into a fine-tuned
Whisper. `build_stt()` in `agent.py` is a swappable factory precisely so that
model can replace the default with one environment variable.

## Setup

**1. LiveKit project** — create one at livekit.io, note the URL, API key and
secret. Put them in this directory's `.env` *and* in the Next.js environment
(`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).

**2. VPS install**

```bash
ssh your-vps
git clone <repo> ongea-pesa && cd ongea-pesa/voice-agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill it in
```

**3. Download model weights** — Silero VAD and the turn detector run locally:

```bash
python agent.py download-files
```

**4. Clone the Ongea voice (optional but recommended)** — upload 10–30s of clean
reference audio at fish.audio, copy the model id from the URL, set `FISH_VOICE_ID`.

**5. Run it**

```bash
python agent.py dev      # local, verbose
python agent.py start    # production
```

**6. systemd** — `/etc/systemd/system/ongea-voice-agent.service`:

```ini
[Unit]
Description=Ongea Pesa LiveKit voice agent
After=network-online.target

[Service]
Type=simple
User=ongea
WorkingDirectory=/home/ongea/ongea-pesa/voice-agent
EnvironmentFile=/home/ongea/ongea-pesa/voice-agent/.env
ExecStart=/home/ongea/ongea-pesa/voice-agent/.venv/bin/python agent.py start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ongea-voice-agent
sudo journalctl -u ongea-voice-agent -f
```

## Enabling it for a user

`profiles.voice_engine` defaults to `elevenlabs` for everyone and is **not**
user-writable — a DB trigger (`guard_voice_engine_update`) rejects any change
that does not come from the service role, so a user cannot move themselves onto
the experimental path even by crafting a request.

Flip an account from the admin settings screen, or directly:

```bash
curl -X PATCH https://ongeapesa.nsait.co.ke/api/admin/voice-engine \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<uuid>","engine":"livekit"}'
```

Changes are written to `security_events` as `voice_engine_changed`.

## Verifying parity before trusting it

The point of running both engines is to compare them, so check the money path is
literally identical rather than assuming:

1. Do a small send on ElevenLabs. Open the n8n execution, save the request body.
2. Flip the same account to `livekit`, repeat the same send.
3. Diff the two n8n request bodies. They should differ only in `source`
   (`elevenlabs` vs `livekit`) and the ids/timestamps.

If any fee field differs, stop and fix it — that means logic has been duplicated
somewhere it should not have been.

## Known gaps

- **Barge-in and turn detection are configured but untuned.** Silero VAD plus the
  multilingual turn detector are good defaults, not Kenyan-tuned ones. Expect to
  adjust once you have real call recordings.
- **`read_balance` falls back to the balance captured at token mint.** It is a
  snapshot from session start, so it goes stale during a long call if the
  webhook does not return a fresher figure.
- **No wake word.** See `docs/natural-listening.md`; Porcupine is already a
  dependency of the web app but unused.

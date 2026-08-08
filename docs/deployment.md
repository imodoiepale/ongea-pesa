# Deployment — going live

Two deployables: the Next.js app on Vercel, and the LiveKit voice worker on the
Hostinger VPS. The worker cannot go on Vercel — serverless functions cannot hold
a long-lived audio session.

## Before anything else: rotate the ElevenLabs key

`lib/elevenlabs.ts` read `NEXT_PUBLIC_ELEVENLABS_API_KEY`. Any `NEXT_PUBLIC_*`
variable is **inlined into the browser bundle at build time**, so that key was
readable by anyone who opened devtools on the production site. The file has been
deleted (it had no importers, so nothing broke), but deleting the code does not
un-publish a key that already shipped.

1. elevenlabs.io → Profile → API Keys → **revoke** the existing key.
2. Create a new one. Store it as `ELEVENLABS_API_KEY` — **no `NEXT_PUBLIC_` prefix**.
   `app/api/get-signed-url/route.ts` already reads that server-side name.
3. Delete `NEXT_PUBLIC_ELEVENLABS_API_KEY` from Vercel and from `.env.local`.
4. Check the ElevenLabs usage dashboard for spend you do not recognise during the
   window the key was public.

Verify nothing references the old name:

```bash
grep -rn "NEXT_PUBLIC_ELEVENLABS" . --exclude-dir=node_modules --exclude-dir=.next
```

**No other rotation is needed.** `.env.local` and `.mcp.json` are both covered by
`.gitignore` (`.env*` at line 22, `.mcp.json` at line 32) and neither has ever
been committed — `git log --all --` is empty for both. An earlier claim in this
project that the Resend key was committed was wrong.

## On handing over credentials

**Never paste an API key into a chat window.** It ends up in the transcript. Put
it in the file and say it is there — secrets are read from disk:

| Target | Location |
|---|---|
| Local dev | `.env.local` |
| Vercel | Dashboard → Settings → Environment Variables |
| Hostinger VPS | `voice-agent/.env`, `chmod 600` |

Creating accounts and paying for plans (LiveKit, Fish Audio, RunPod, Railway) is
yours to do — those need your payment details.

## Keys you need to obtain

| Variable | Where | Needed by |
|---|---|---|
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | livekit.io → project → Settings → Keys | **both** Vercel and the VPS |
| `FISH_API_KEY` | fish.audio → Developers | VPS |
| `FISH_VOICE_ID` | fish.audio, after cloning a voice from 10–30s of audio | VPS (optional) |
| `FISH_USD_PER_1K_CHARS` | your fish.audio plan pricing | VPS — without it TTS cost is not recorded |
| `ONGEA_LLM_API_KEY` | your LLM provider | VPS |
| `N8N_CALLBACK_SECRET` | already set in the app; copy the same value | VPS |
| `N8N_WEBHOOK_AUTH_TOKEN` | already set in the app; copy the same value | VPS (optional) |
| `ONGEA_ENVIRONMENT` | `live` or `test` | both — see `docs/environments.md` |

LiveKit's free tier is enough to prove the worker end to end.

## Step 1 — Vercel

Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (for
`app/api/voice/livekit-token/route.ts`), set `ONGEA_ENVIRONMENT=live` on
production and `test` on preview, and confirm `N8N_CALLBACK_SECRET` is present —
the sweeper and cost-recording routes refuse to run without it. Redeploy.

## Step 2 — the VPS worker

```bash
ssh your-vps
git clone <repo> ongea-pesa && cd ongea-pesa/voice-agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && chmod 600 .env    # then fill it in
python agent.py download-files            # Silero VAD + turn-detector weights
python agent.py dev                       # verbose, foreground
```

Once it connects cleanly, install the systemd unit from
[`voice-agent/README.md`](../voice-agent/README.md) and:

```bash
sudo systemctl enable --now ongea-voice-agent
sudo journalctl -u ongea-voice-agent -f
```

## Step 3 — schedule the two sweepers

Both are secret-gated `POST` routes expecting `x-ongea-secret:
$N8N_CALLBACK_SECRET`. Add an n8n Schedule Trigger for each:

| Route | Cadence | What it does |
|---|---|---|
| `/api/ncba/stk-sweep` | every 5 min | Fails deposits stranded in `processing` |
| `/api/voice/session/sweep` | every 5 min | Settles voice sessions stranded by a killed tab |

The voice sweeper **refuses to bill** when a session's timestamps are not
self-consistent, expiring it at zero instead. That guard exists because migration
028 backfilled `started_at` with `now()`, and billing from it would have charged
KSh 59,854 per session — KSh 1,616,078 across four real users. Do not relax it.

## Step 4 — enable LiveKit for one account

`profiles.voice_engine` defaults to `elevenlabs` for everyone and is **not**
user-writable: a DB trigger (`guard_voice_engine_update`) rejects any change not
made by the service role. Flip an account from
`/admin-analytics/settings` → Voice Engine, or:

```bash
curl -X PATCH https://ongeapesa.nsait.co.ke/api/admin/voice-engine \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<uuid>","engine":"livekit"}'
```

Changes are audited to `security_events` as `voice_engine_changed`.

## Step 5 — prove the money path is identical

The point of running two engines is comparison, so verify parity rather than
assuming it:

1. Small send on ElevenLabs. Open the n8n execution, save the request body.
2. Flip the same account to `livekit`. Repeat the identical send.
3. Diff the two n8n bodies. They should differ only in `source`
   (`elevenlabs` vs `livekit`) and ids/timestamps.

Any difference in a fee field means logic has been duplicated where it should not
be — fix that before trusting either engine.

## Step 6 — confirm cost tracking is live

After a LiveKit call, `/admin-analytics/economics` should show a `fish_audio` /
`tts` row under Infrastructure spend and a populated Voice unit economics panel.

If the panel says nothing is recorded, check in order: `FISH_USD_PER_1K_CHARS`
set on the VPS, `N8N_CALLBACK_SECRET` matching between VPS and app, and the
worker logs for `cost report failed`.

**Until costs are recorded, margin on that dashboard is gross of infrastructure**
— the API returns an explicit warning banner saying so, rather than letting an
empty cost table read as "we spend nothing".

## What is still not wired

Honest list of gaps, so none of these surprise you in production:

- **Provider transaction costs are never persisted.** `transaction_cost` is 0 on
  every completed row, because n8n writes those rows and the app-side rail code
  that would set `providerFee` (`WalletService.resolveRailAndSend`) is not called
  by any route. NCBA/Safaricom charges are therefore missing from margin.
- **`scheduled_payments` has a table and a full CRUD API but no runner.**
  Schedules never fire.
- **`process_subscription_payment` does not exist in the DB** but is called by
  `app/api/subscription/pay/route.ts`.
- **No wake word.** Porcupine is a dependency but unused — see
  `docs/natural-listening.md`.
- **Two competing service workers**: `@ducanh2912/next-pwa` overwrites the
  checked-in `public/sw.js` at build.
- **Sheng ASR is not fine-tuned yet.** The corpus pipeline is live at `/training`;
  see `docs/sheng-asr-finetuning.md` for the RunPod half.

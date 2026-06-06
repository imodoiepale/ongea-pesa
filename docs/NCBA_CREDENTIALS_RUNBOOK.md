# NCBA Credentials Runbook

> What to do when NCBA stops accepting your token — the 5-minute version.

---

## Symptom

Any call to NCBA returns 401 (Unauthorized), or `NCBA Get Token` returns:
```json
{ "type": "…rfc9110#section-15.5.2", "title": "Unauthorized", "status": 401 }
```
This means NCBA rejected `userID` + `password` + `subscription-key` at the **gateway**. It is almost never a code bug — the n8n token call is byte-stable.

## Where to look

1. Open the n8n workflow in question — usually **NCBA Send** (`xjG51cY41GHarQFu` on Railway, `<id>` on Hostinger) or **NCBA Bill Pay** — and re-run `Manual Test`.
2. Inspect the `NCBA Get Token` node output. A 401 here cascades into every downstream node failing.

## Likely causes (in order)

1. **UAT password rotated** by NCBA after a subscription change. Most common right after they enable new endpoints/test numbers for you.
2. **API user locked** from too many failed attempts (we've seen this during heavy testing).
3. **Subscription key disabled** or moved between APIM products.
4. **Token throttle** — short transient burst.

## Fix

### 1. Retry once (rule out throttle)
Wait 30 seconds, re-run Manual Test. If it succeeds, it was throttle. Done.

### 2. Email NCBA Cash Management
Primary contact:
- **Jemalel Kiruok** — `Jemalel.Kiruok@ncbagroup.com`, +254 711 041 018 / +254 202 888 018

Boilerplate to send:

> Subject: UAT — `Auth/generate-token` returning 401 for UserID `NtbUATob254`
>
> Hi Jemalel,
>
> Our token call to `/api/v1/Auth/generate-token` is returning **401 Unauthorized** for UserID `NtbUATob254`, Subscription Key `e098b82d…` (same request that worked earlier). Could you please confirm whether the **password was rotated** or the API user is **locked**, and reset/unlock if needed?
>
> Thanks,
> Nairobi Space of AI Tools

Typical turnaround: same business day.

### 3. Rotate the password constant once they confirm

NCBA usually sends the new password by email. Once received, update **both** workflow `Build … Config` code nodes:

**NCBA Send → `Build Send Config` code node:**
```js
const NCBA_PASSWORD = "<NEW_PASSWORD_FROM_NCBA>";
```

**NCBA Bill Pay → `Build Bill Config` code node:**
```js
const NCBA_PASSWORD = "<NEW_PASSWORD_FROM_NCBA>";
```

Save → re-run Manual Test → confirm token returns. No publish needed for testing.

## Production note

Once on production credentials (a different `UserID` + key per the signed Payment Integration Agreement), repeat the same procedure but escalate faster — production downtime affects live customers. Keep Jemalel's mobile (`+254 711 041 018`) for after-hours.

## Don't bother changing

- The token endpoint URL, headers, or body — they're stable.
- The Bearer prefix or `accessToken` field name — confirmed correct per the UAT guide example.
- The Subscription-Key header — same value across all calls.

If credentials are confirmed valid and `generate-token` still 401s, that's an NCBA infrastructure incident (not ours). Reply-all on the email thread with the `x-azure-ref` from the failed response.

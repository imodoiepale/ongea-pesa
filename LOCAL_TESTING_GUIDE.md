# 🧪 Local Testing Guide for Ongea Pesa

## Problem: Testing ElevenLabs Webhooks Locally

ElevenLabs needs a public URL to send webhook requests to your API. Since `localhost:3000` is not accessible from the internet, you need a tunneling service to expose your local server.

---

## ✅ Solution: Use ngrok (or alternatives)

### Option 1: ngrok (Recommended)

#### Step 1: Install ngrok

**Windows (Chocolatey):**
```bash
choco install ngrok
```

**Windows (Manual):**
1. Download from [ngrok.com/download](https://ngrok.com/download)
2. Extract `ngrok.exe` to a folder
3. Add to PATH or run from that folder

**Alternative - npm:**
```bash
npm install -g ngrok
```

#### Step 2: Start Your Next.js App
```bash
npm run dev
```

Your app runs on `http://localhost:3000`

#### Step 3: Start ngrok Tunnel
Open a new terminal and run:
```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://a1b2c3d4.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### Step 4: Copy the Forwarding URL
Your public URL: `https://a1b2c3d4.ngrok-free.app`

#### Step 5: Update ElevenLabs Webhook
1. Go to ElevenLabs Dashboard
2. Edit your agent's `send_money` tool
3. Update URL to:
   ```
   https://a1b2c3d4.ngrok-free.app/api/voice/webhook
   ```
4. Save

#### Step 6: Test!
1. Open your browser to `http://localhost:3000`
2. Sign in
3. Voice interface loads
4. Speak: "Send 100 to 0712345678"
5. Check ngrok terminal for incoming requests
6. Check browser DevTools → Network for API calls

#### Step 7: Monitor Requests
Visit `http://127.0.0.1:4040` to see ngrok's web interface with:
- All incoming requests
- Request/response details
- Replay requests
- Inspect payloads

---

### Option 2: localtunnel

#### Install
```bash
npm install -g localtunnel
```

#### Start tunnel
```bash
# Start your app first
npm run dev

# In another terminal
lt --port 3000 --subdomain ongeapesa
```

URL: `https://ongeapesa.loca.lt`

**Note**: May require clicking through a warning page on first visit.

---

### Option 3: Cloudflare Tunnel (cloudflared)

#### Install
Download from [developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation)

#### Start tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```

You'll get a URL like: `https://random-words-123.trycloudflare.com`

---

## 🔄 Complete Local Testing Workflow

### 1. Terminal 1 - Next.js Dev Server
```bash
cd c:\Users\ADMIN\Documents\GitHub\ongea-pesa
npm run dev
```

### 2. Terminal 2 - ngrok Tunnel
```bash
ngrok http 3000
```

### 3. Update ElevenLabs Agent
- Copy ngrok URL: `https://xyz123.ngrok-free.app`
- Update webhook to: `https://xyz123.ngrok-free.app/api/voice/webhook`

### 4. Test Voice Commands
1. Open browser: `http://localhost:3000`
2. Sign in with Supabase
3. Voice interface auto-starts
4. Say: "Send 500 to 0712345678"

### 5. Monitor Everything

**Browser DevTools (F12):**
- Network tab → See API calls
- Console → See logs

**ngrok Dashboard (http://127.0.0.1:4040):**
- See ElevenLabs webhook calls
- Inspect request payloads
- View responses

**Terminal:**
- Next.js console logs
- API route logs

---

## 🐛 Troubleshooting Local Testing

### ngrok URL Changes
**Problem**: ngrok URL changes every restart (free tier)

**Solutions**:
1. **Get ngrok account** (free): Fixed subdomain
2. **Use localtunnel** with `--subdomain` flag
3. **Update ElevenLabs** webhook URL each time

### ngrok Free Tier Warning Page
**Problem**: Users see ngrok warning before accessing site

**Solution**:
- Click "Visit Site" button
- Or get ngrok paid account
- Or use Cloudflare Tunnel (no warning page)

### CORS Errors
**Problem**: ElevenLabs webhook blocked by CORS

**Solution**: Already handled in `/api/voice/webhook/route.ts`:
```typescript
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

### Webhook Not Reaching Your API
**Check**:
1. ngrok is running: `ngrok http 3000`
2. Next.js is running: `npm run dev`
3. ElevenLabs webhook URL is correct
4. ngrok dashboard shows incoming requests

### Authentication Errors
**Problem**: User not authenticated in webhook

**Check**:
1. You're logged in at `localhost:3000`
2. Session cookie is set
3. Middleware is working
4. Supabase env vars are correct

---

## 📊 Testing Checklist

### Before Testing
- [ ] Next.js running on `localhost:3000`
- [ ] ngrok tunnel running
- [ ] ElevenLabs webhook URL updated to ngrok URL
- [ ] Supabase env vars in `.env.local`
- [ ] ElevenLabs agent ID in `.env.local`

### During Testing
- [ ] Sign in successfully
- [ ] Voice interface loads
- [ ] Connection status shows "Connected"
- [ ] Can speak commands
- [ ] Agent responds
- [ ] ngrok shows incoming webhook calls
- [ ] n8n receives data (check Railway logs)

### Verify Data Flow
1. **Browser**: User speaks → See transcript
2. **ngrok**: ElevenLabs calls webhook → See in dashboard
3. **Next.js**: API enriches data → See console logs
4. **n8n**: Receives payload → Check Railway logs
5. **Browser**: Agent responds → Hear confirmation

---

## 🚀 When to Switch to Production

### Use ngrok for:
- ✅ Initial development
- ✅ Testing webhook integration
- ✅ Debugging issues
- ✅ Trying new features

### Deploy to Vercel when:
- ✅ Basic flow works locally
- ✅ Authentication works
- ✅ Webhook receives data correctly
- ✅ n8n processes transactions
- ✅ Ready for persistent testing

---

## 🎯 Quick Start Commands

### Full Local Setup (3 Terminals)

**Terminal 1 - Next.js:**
```bash
npm run dev
```

**Terminal 2 - ngrok:**
```bash
ngrok http 3000
```

**Terminal 3 - Test Commands:**
```bash
# Copy ngrok URL
echo "Update ElevenLabs webhook to: [ngrok-url]/api/voice/webhook"

# Open browser
start http://localhost:3000

# Open ngrok dashboard
start http://127.0.0.1:4040
```

---

## 🔗 Production Deployment

Once testing works locally, deploy to production:

```bash
# Deploy to Vercel
vercel

# Or use Vercel CLI with production flag
vercel --prod
```

**Update ElevenLabs webhook to:**
```
https://ongeapesa.vercel.app/api/voice/webhook
```

**Environment Variables in Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
3. Redeploy

---

## 💡 Pro Tips

### 1. ngrok Config File
Create `~/.ngrok2/ngrok.yml`:
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  ongea:
    proto: http
    addr: 3000
```

Start with: `ngrok start ongea`

### 2. Auto-restart on Code Changes
Next.js already has hot reload, but for ngrok:
```bash
# Use npm-run-all to run both in one terminal
npm install -g npm-run-all
npm-run-all --parallel dev tunnel
```

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "tunnel": "ngrok http 3000",
    "dev:tunnel": "npm-run-all --parallel dev tunnel"
  }
}
```

Then run: `npm run dev:tunnel`

### 3. Save ngrok URLs
Keep a note of your ngrok URL and update ElevenLabs once per session.

---

## ✅ You're Ready!

Now you can test your voice-activated payment system locally before deploying to production at `https://ongeapesa.vercel.app`! 🎤

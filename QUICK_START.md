# ⚡ Quick Start - Test Locally RIGHT NOW

## 🎯 Goal
Get your voice-activated payment system running locally in 5 minutes.

---

## Step 1: Install Dependencies (1 min)

```bash
cd c:\Users\ADMIN\Documents\GitHub\ongea-pesa
npm install
```

---

## Step 2: Install ngrok (1 min)

**Using Chocolatey (if installed):**
```bash
choco install ngrok
```

**OR Download manually:**
1. Visit https://ngrok.com/download
2. Download Windows version
3. Extract `ngrok.exe` anywhere
4. Remember the path

---

## Step 3: Set Environment Variables (1 min)

Create `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id-here
```

Get these from:
- Supabase: Project Settings → API
- ElevenLabs: Agent Settings → Agent ID

---

## Step 4: Start Everything (2 mins)

### Terminal 1 - Start Next.js
```bash
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

### Terminal 2 - Start ngrok
```bash
ngrok http 3000
```

You'll see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy that URL!** → `https://abc123.ngrok-free.app`

---

## Step 5: Update ElevenLabs Webhook (1 min)

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Click your agent → **Edit**
3. Go to **Tools** section
4. Find `send_money` tool (or create it using `elevenlabs-config.json`)
5. Update webhook URL to:
   ```
   https://abc123.ngrok-free.app/api/voice/webhook
   ```
   *(Replace with YOUR ngrok URL)*
6. Click **Save**

---

## Step 6: Test! 🎤

1. Open browser: `http://localhost:3000`
2. You'll be redirected to `/login`
3. Sign up or sign in
4. Voice interface appears automatically
5. Wait for "Connected" status
6. Speak: **"Send 100 to 0712345678"**
7. Agent should respond!

---

## 🐛 If It's Not Working

### Check This First:
```bash
# Is Next.js running?
# Terminal 1 should show: ✓ Ready on http://localhost:3000

# Is ngrok running?
# Terminal 2 should show: Forwarding https://...

# Can you access the app?
# Browser: http://localhost:3000 should load

# Is ElevenLabs webhook updated?
# Should be: https://YOUR-NGROK-URL/api/voice/webhook
```

### Common Issues:

**"Module not found: @/components/protected-route"**
- ✅ FIXED - File is now created

**"Can't connect to voice agent"**
- Check `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` in `.env.local`
- Verify agent ID from ElevenLabs dashboard

**"Webhook not receiving data"**
- Verify ngrok URL in ElevenLabs matches ngrok terminal
- Check ngrok dashboard: `http://127.0.0.1:4040`
- Make sure webhook URL ends with `/api/voice/webhook`

**"User not authenticated"**
- Make sure you signed in at `localhost:3000`
- Check browser DevTools → Application → Cookies

---

## 📊 Monitor Everything

### ngrok Dashboard
Open: `http://127.0.0.1:4040`
- See all incoming webhook requests
- Inspect payloads
- Debug issues

### Browser DevTools (F12)
- **Console tab**: See logs
- **Network tab**: See API calls
- **Application → Cookies**: Verify auth session

### Next.js Terminal
- See API logs
- See authentication status
- See n8n forwarding

---

## ✅ Success Looks Like:

1. ✅ Next.js running on `localhost:3000`
2. ✅ ngrok forwarding to public URL
3. ✅ Can sign in successfully
4. ✅ Voice interface loads
5. ✅ Connection status: "Connected"
6. ✅ Agent responds to voice commands
7. ✅ ngrok shows incoming webhook calls
8. ✅ Data forwarded to n8n

---

## 🚀 When Ready for Production

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. Add environment variables in Vercel dashboard

3. Update ElevenLabs webhook to:
   ```
   https://ongeapesa.vercel.app/api/voice/webhook
   ```

4. Test on production URL!

---

## 🎉 That's It!

You should now have:
- ✅ Voice interface running locally
- ✅ ElevenLabs agent connected
- ✅ Webhook forwarding to n8n
- ✅ Authentication working
- ✅ Full voice-to-payment flow

**Test command**: "Send 500 to 0712345678" or "Tuma pesa 1000 kwa mama 0798765432"

Need help? Check:
- `LOCAL_TESTING_GUIDE.md` - Detailed local testing guide
- `SETUP_GUIDE.md` - Complete setup instructions
- `ELEVENLABS_TOOL_CONFIG.md` - Tool configuration reference

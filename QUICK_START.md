# ⚡ Quick Start Guide

Get Ongea Pesa running locally in **5 minutes**.

---

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- Supabase account (free tier OK)
- ElevenLabs account (free tier OK)

---

## 🚀 Step 1: Clone & Install (2 min)

```bash
# Clone repository
git clone https://github.com/yourusername/ongea-pesa.git
cd ongea-pesa

# Install dependencies
npm install
```

---

## 🔑 Step 2: Get API Keys (2 min)

### Supabase
1. Go to [supabase.com](https://supabase.com) → Create project
2. Go to **Settings** → **API**
3. Copy:
   - `Project URL`
   - `anon public` key

### ElevenLabs
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Create conversational AI agent
3. Copy:
   - `Agent ID` (from agent settings)
   - `API Key` (from profile settings)

### Google Gemini (Optional - for scanner)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create API key
3. Copy the key

---

## ⚙️ Step 3: Configure Environment (1 min)

Create `.env.local` file in project root:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_AGENT_ID=your-elevenlabs-agent-id
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Optional
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

---

## 🗄️ Step 4: Setup Database (2 min)

1. Go to your Supabase project
2. Click **SQL Editor** → **New Query**
3. Run these scripts **in order**:

### Script 1: Main Schema
Copy from: `docs/schema/database-schema.sql`

### Script 2: Setup Tables
Copy from: `docs/schema/supabase-schema.sql`

### Script 3: Triggers
Copy from: `docs/schema/triggers.sql`

Click **Run** after pasting each script.

---

## 🎬 Step 5: Start Development Server

```bash
npm run dev
```

Open browser: **http://localhost:3000**

---

## ✅ Step 6: Test It Out!

### First Time Setup
1. You'll be redirected to `/login`
2. Click "Sign Up"
3. Enter email and password
4. Check email for verification link
5. After verification, login

### Test Voice Interface
1. Voice interface should auto-start
2. Wait for "Connected" status (green dot)
3. Click and hold the microphone button
4. Say: **"Check my balance"**
5. Release button
6. AI should respond with your balance!

### Test Document Scanner
1. Click "Payment Scanner" from dashboard
2. Allow camera access
3. Take a photo of any document
4. AI will analyze it instantly

---

## 🐛 Troubleshooting

### "Connection failed"
- Check `NEXT_PUBLIC_AGENT_ID` is correct
- Verify ElevenLabs agent is active
- Check browser console for errors

### "Authentication required"
- Make sure you signed up and verified email
- Clear cookies and try again
- Check Supabase Auth settings

### "Database error"
- Verify all SQL scripts ran successfully
- Check Supabase logs in dashboard
- Ensure RLS policies are created

### Voice not connecting
- Check `ELEVENLABS_API_KEY` is set
- Verify agent ID matches your ElevenLabs agent
- Check browser mic permissions

---

## 📱 Local Testing with n8n (Optional)

### Using ngrok
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Expose to internet
npx ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

Update ElevenLabs webhook:
- Go to agent tools configuration
- Set webhook URL: `https://abc123.ngrok-free.app/api/voice/webhook`

Now you can test the full flow with n8n integration!

---

## 🎯 What to Test

### Basic Commands
```
✅ "Check my balance"
✅ "Send 500 to 0712345678"
✅ "What's my transaction history?"
✅ "Pay paybill 247247 account 123 amount 1000"
```

### Sheng Commands
```
✅ "Niangalie balance"
✅ "Tuma pesa 1000 kwa mama"
✅ "Lipa bill ya stima"
```

---

## 📚 Next Steps

- Read [docs/setup/LOCAL_TESTING.md](docs/setup/LOCAL_TESTING.md) for detailed testing
- See [docs/integrations/N8N_INTEGRATION.md](docs/integrations/N8N_INTEGRATION.md) for workflow setup
- Check [docs/deployment/VERCEL.md](docs/deployment/VERCEL.md) to deploy to production

---

## 💡 Tips

1. **Balance starts at KES 10,000** - Test balance is auto-created
2. **Transactions are simulated** - Set up n8n for real M-Pesa
3. **Voice sessions timeout after 5 seconds** of inactivity
4. **Camera only works on HTTPS** or localhost

---

## 🆘 Need Help?

- Check [docs/](docs/) folder for detailed guides
- Open an [issue on GitHub](https://github.com/yourusername/ongea-pesa/issues)
- Review browser console for errors
- Check Supabase logs

---

**That's it! You're ready to use Ongea Pesa** 🎉

Speak your money into action! 🗣️💰

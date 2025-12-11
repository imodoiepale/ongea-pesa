# 🚀 Production Setup - Deploy & Configure

## ✅ What Changed

1. ✅ Removed `-test` from n8n webhook URL (production mode)
2. ✅ Added **Back** and **End Call** buttons to voice interface
3. ✅ Ready for production deployment

---

## 📋 Deployment Steps

### Step 1: Deploy Next.js to Vercel/Railway

#### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click **New Project**
4. Import your repository
5. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...
   ELEVENLABS_API_KEY=sk_...
   NEXT_PUBLIC_GEMINI_API_KEY=your_key
   ```
6. Click **Deploy**
7. Get your production URL: `https://your-app.vercel.app`

#### Option B: Railway

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. New Project → Deploy from GitHub
4. Add same environment variables
5. Deploy
6. Get URL: `https://your-app.up.railway.app`

---

### Step 2: Configure ElevenLabs to Use Your API

After deployment, update ElevenLabs:

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Select your **Ongea Pesa** agent
3. Click **Tools** → **send_money** webhook
4. **Update the URL:**

**OLD (ngrok - only works when running locally):**
```
https://d3c0ff66f0f3.ngrok-free.app/api/voice/webhook
```

**NEW (Your deployed Next.js API):**
```
https://your-app.vercel.app/api/voice/webhook
```

**Replace `your-app.vercel.app` with YOUR actual domain!**

5. Click **Save**

---

### Step 3: Update n8n Webhook (In Production Mode)

Your n8n webhook URL changed from:
```
/webhook/send_money  ❌ (test mode)
```

To:
```
/webhook/send_money  ✅ (production mode)
```

**In n8n:**
1. Open your workflow
2. Click the **Webhook** node
3. Change **Webhook Path** to: `send_money`
4. **Production URL** should be checked
5. **Save** and **Activate** workflow

---

## 🎯 Complete Flow (Production)

```
User speaks
    ↓
ElevenLabs Agent
    ↓
Your Next.js API (Vercel/Railway)  ← NEW! No more ngrok
    ↓
n8n Webhook (Railway production)
    ↓
Supabase Database
    ↓
Response back to user
```

---

## ✅ New UI Features

### Back Button
- Always enabled
- Returns to dashboard
- Preserves voice session

### End Call Button
- Only enabled when voice is active
- Ends ElevenLabs session
- Clears transcript
- Returns to dashboard

---

## 🧪 Testing Production Setup

### Test Locally First

```bash
npm run dev
```

1. Open `localhost:3000`
2. Login
3. Go to voice interface
4. Test **Back** button → Should return to dashboard
5. Start voice call
6. Test **End Call** button → Should stop voice and return

### Test on Production

1. Deploy to Vercel/Railway
2. Visit your production URL
3. Login
4. Test voice commands
5. Check n8n logs for requests

---

## 🔧 Environment Variables Needed

### For Next.js (Vercel/Railway)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_API_KEY=sk_...

# Gemini (for payment scanner)
NEXT_PUBLIC_GEMINI_API_KEY=...

# n8n (optional - if you add auth)
N8N_WEBHOOK_AUTH_TOKEN=Bearer your-token
```

---

## 📱 How Users Will Access

### Development (Local)
```
http://localhost:3000
```
- Uses ngrok for ElevenLabs webhook
- Only works when `npm run dev` is running

### Production (Deployed)
```
https://your-app.vercel.app
```
- Works 24/7
- ElevenLabs calls your deployed API directly
- No ngrok needed!

---

## 🔄 Migration Checklist

- [ ] Deploy Next.js to Vercel/Railway
- [ ] Get production URL
- [ ] Update ElevenLabs webhook URL
- [ ] Update n8n to production mode (remove `-test`)
- [ ] Add environment variables to deployment
- [ ] Test voice commands on production
- [ ] Test Back button
- [ ] Test End Call button
- [ ] Verify transactions in Supabase

---

## 🎉 Benefits of Production Deployment

✅ **No ngrok needed** - Direct API calls  
✅ **Always available** - Works 24/7  
✅ **Faster** - No extra tunnel hop  
✅ **Scalable** - Vercel/Railway auto-scales  
✅ **SSL by default** - HTTPS everywhere  
✅ **Better UX** - Back and End Call buttons  

---

## 🐛 Troubleshooting

### ElevenLabs not calling my API

**Check:**
1. Is the URL correct in ElevenLabs dashboard?
2. Is your app deployed and accessible?
3. Try visiting: `https://your-app.vercel.app/api/voice/webhook`
   - Should return error (POST required) but shows it's accessible

### n8n webhook failing

**Check:**
1. Changed from `/webhook/` to `/webhook/`?
2. Workflow is **activated** in production mode?
3. Test manually with curl:
   ```bash
   curl -X POST https://primary-production-579c.up.railway.app/webhook/send_money \
     -H "Content-Type: application/json" \
     -d '{"user_id":"test","type":"send_phone","amount":100}'
   ```

### Back button not working

**Check:**
- Is `onNavigate` prop passed correctly?
- Console for any errors?

---

## 🚀 You're Ready!

**Deploy now:**
1. Push to GitHub
2. Deploy on Vercel (5 minutes)
3. Update ElevenLabs URL
4. Test!

**Your production voice-activated payment app is ready!** 🎉

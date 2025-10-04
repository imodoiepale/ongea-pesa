# 🎤 Update ElevenLabs to Use Your Next.js API

## 🎯 Quick Steps

### 1. Deploy Your Next.js App

**Choose one:**

- **Vercel** (easiest): [vercel.com/new](https://vercel.com/new)
- **Railway**: [railway.app](https://railway.app)
- **Netlify**: [netlify.com](https://netlify.com)

**You'll get a URL like:**
```
https://ongea-pesa.vercel.app
```

---

### 2. Update ElevenLabs Webhook

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Click on your **Ongea Pesa** agent
3. Go to **Tools** tab
4. Click on **send_money** webhook

5. **Change the URL:**

**From (ngrok - local only):**
```
https://d3c0ff66f0f3.ngrok-free.app/api/voice/webhook
```

**To (your deployed app):**
```
https://ongea-pesa.vercel.app/api/voice/webhook
```

6. Click **Save**

---

## ✅ That's It!

Now ElevenLabs will call **your deployed Next.js API** directly!

**Benefits:**
- ✅ Works 24/7 (no need to run `npm run dev`)
- ✅ No ngrok needed
- ✅ Faster (no tunnel)
- ✅ More reliable

---

## 🧪 Test It

1. Go to your deployed URL: `https://ongea-pesa.vercel.app`
2. Login
3. Open voice interface
4. Say: **"Send 100 to 0712345678"**

**It should work without ngrok!**

---

## 🔍 Verify Configuration

### Check ElevenLabs:
```
Dashboard → Your Agent → Tools → send_money
URL should be: https://YOUR-DOMAIN/api/voice/webhook
```

### Check Your API is Live:
Visit in browser:
```
https://ongea-pesa.vercel.app/api/voice/webhook
```

Should show error (needs POST) but proves it's accessible.

---

## 📋 Full Deployment URL Examples

**Vercel:**
```
https://ongea-pesa.vercel.app/api/voice/webhook
```

**Railway:**
```
https://ongea-pesa.up.railway.app/api/voice/webhook
```

**Netlify:**
```
https://ongea-pesa.netlify.app/api/voice/webhook
```

**Custom Domain:**
```
https://app.ongeapesa.com/api/voice/webhook
```

---

## 🎉 You're Done!

No more running ngrok or local server for production!

Your voice-activated payments now work from anywhere! 🚀

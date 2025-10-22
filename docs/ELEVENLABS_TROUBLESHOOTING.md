# 🎙️ ElevenLabs Connection Troubleshooting

## Issue: "Speaking via browser TTS (ElevenLabs not connected)"

Your scanner is working perfectly, but it's using **browser TTS** instead of **ElevenLabs natural voice**.

---

## ✅ Quick Diagnosis

### Check Browser Console

Look for these logs when the app loads:

#### ✅ **If ElevenLabs IS Connected:**
```
🚀 Starting global ElevenLabs session for userId: user_abc123
✅ Got signed URL for userId: user_abc123
🎙️ Global ElevenLabs connected
💰 Balance updated for ElevenLabs context: 67550
```

#### ❌ **If ElevenLabs IS NOT Connected:**
```
🔊 Speaking via browser TTS (ElevenLabs not connected)
```

---

## 🔧 Fix #1: Add Environment Variables

### Step 1: Check `.env.local` File

Open `c:\Users\user\Documents\GitHub\ongea-pesa\.env.local`

### Step 2: Add ElevenLabs Configuration

```env
# ElevenLabs Conversational AI
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
ELEVENLABS_API_KEY=your_api_key_here
```

### Step 3: Get Your Credentials

#### Get Agent ID:
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Create or select a Conversational AI agent
3. Copy the **Agent ID** (starts with `agent_`)
4. Paste into `.env.local`

#### Get API Key:
1. Go to [ElevenLabs API Keys](https://elevenlabs.io/app/settings/api-keys)
2. Create a new API key or copy existing
3. Copy the key (starts with `sk_`)
4. Paste into `.env.local`

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## 🔧 Fix #2: Verify User Authentication

ElevenLabs **only connects when user is logged in**.

### Check Authentication Status

Open browser console and check:

```javascript
// Check if user is logged in
console.log('User ID:', userId);  // Should NOT be null
```

### If User ID is null:

1. **Log in to the app**
   - Go to login page
   - Sign in with your account
   - Return to scanner

2. **Check Supabase Auth**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - Check Supabase dashboard for active users

---

## 🔧 Fix #3: Check ElevenLabs Context

### Verify Context is Loaded

In `components/ongea-pesa/payment-scanner.tsx` line 59:

```typescript
const { isConnected: elevenLabsConnected, isSpeaking, conversation } = useElevenLabs()
```

### Check in Browser Console:

```javascript
// Should log connection status
console.log('ElevenLabs Connected:', elevenLabsConnected);  // Should be true
console.log('Conversation:', conversation);  // Should be object, not null
```

### If `elevenLabsConnected` is false:

Check `contexts/ElevenLabsContext.tsx` for errors:

```typescript
// Line 157-204: Auto-start session
// Look for error logs:
console.error('Failed to start ElevenLabs session:', error);
```

---

## 🔧 Fix #4: Check API Endpoint

### Verify Signed URL API

Test the endpoint:

```bash
curl -X POST http://localhost:3000/api/get-signed-url \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "signedUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...",
  "userId": "user_abc123",
  "userEmail": "user@example.com"
}
```

**If Error:**
- Check `app/api/get-signed-url/route.ts`
- Verify `ELEVENLABS_API_KEY` is set
- Check ElevenLabs API quota

---

## 🎯 Current Status: Scanner Works!

**Good News:** Your scanner is **fully functional** even without ElevenLabs!

### What's Working:
- ✅ Camera scanning
- ✅ AI detection (Gemini 2.5 Flash Lite)
- ✅ Payment extraction
- ✅ Voice feedback (browser TTS)
- ✅ Balance checking
- ✅ Multiple payment selection

### What You're Missing:
- ❌ Natural ElevenLabs voice (using robotic browser TTS instead)
- ❌ Conversational AI responses
- ❌ Voice commands to ElevenLabs

---

## 💡 Option: Use Browser TTS (No Setup Required)

If you don't want to set up ElevenLabs, **browser TTS works great**!

### Improved Browser TTS

I've already enhanced the browser TTS with:
- ✅ Better voice selection (Google voices preferred)
- ✅ Normal speed (1.0x)
- ✅ Full volume
- ✅ Clear pronunciation

### Test Browser TTS:

```javascript
// In browser console
window.speechSynthesis.speak(
  new SpeechSynthesisUtterance("Till number detected! 331701")
);
```

---

## 📊 Comparison: ElevenLabs vs Browser TTS

| Feature | ElevenLabs | Browser TTS |
|---------|------------|-------------|
| **Voice Quality** | Natural, human-like | Robotic |
| **Setup Required** | Yes (API keys) | No |
| **Cost** | Paid (after free tier) | Free |
| **Conversational** | Yes | No |
| **Offline** | No | Yes (some browsers) |
| **Speed** | Fast | Fast |
| **Languages** | Many | Many |

---

## 🐛 Common Errors & Solutions

### Error: "Failed to get signed URL"

**Cause:** Missing or invalid `ELEVENLABS_API_KEY`

**Solution:**
1. Check `.env.local` has `ELEVENLABS_API_KEY=sk_...`
2. Verify key is valid on ElevenLabs dashboard
3. Restart dev server

---

### Error: "Session already active"

**Cause:** Duplicate ElevenLabs connection attempt

**Solution:**
1. Refresh browser page
2. Check only one `ElevenLabsProvider` exists
3. Clear browser cache

---

### Error: "Unauthorized"

**Cause:** User not authenticated

**Solution:**
1. Log in to the app
2. Check Supabase auth is working
3. Verify user session is active

---

### Error: "Agent not found"

**Cause:** Invalid `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

**Solution:**
1. Go to ElevenLabs dashboard
2. Copy correct Agent ID
3. Update `.env.local`
4. Restart dev server

---

## 🔍 Debug Checklist

Run through this checklist:

### Environment Variables
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is set
- [ ] `ELEVENLABS_API_KEY` is set
- [ ] Dev server restarted after changes

### Authentication
- [ ] User is logged in
- [ ] `userId` is not null
- [ ] Supabase auth working
- [ ] User session active

### ElevenLabs Context
- [ ] `ElevenLabsProvider` wraps app
- [ ] `useElevenLabs()` hook works
- [ ] `isConnected` is true
- [ ] `conversation` object exists

### API Endpoints
- [ ] `/api/get-signed-url` returns 200
- [ ] Signed URL is valid
- [ ] ElevenLabs API quota not exceeded
- [ ] Network requests succeed

### Browser Console
- [ ] No JavaScript errors
- [ ] Connection logs appear
- [ ] No CORS errors
- [ ] WebSocket connects

---

## 📝 Example `.env.local` File

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_abc123xyz
ELEVENLABS_API_KEY=sk_abc123xyz...

# Gemini (for scanner)
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...

# n8n (optional)
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/...
N8N_WEBHOOK_AUTH_TOKEN=your_token
```

---

## 🚀 Quick Test

### Test ElevenLabs Connection:

1. **Open browser console**
2. **Run this command:**
   ```javascript
   fetch('/api/get-signed-url', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```
3. **Check response:**
   - ✅ Should return `signedUrl`, `userId`, `userEmail`
   - ❌ If error, check environment variables

---

## 💬 Still Not Working?

### Check These Files:

1. **`contexts/ElevenLabsContext.tsx`** (lines 157-204)
   - Auto-start session logic
   - Connection error handling

2. **`app/api/get-signed-url/route.ts`**
   - Signed URL generation
   - API key validation

3. **`components/ongea-pesa/payment-scanner.tsx`** (line 59)
   - ElevenLabs hook usage
   - Connection status check

### Enable Debug Logging:

Add to browser console:
```javascript
localStorage.setItem('debug', 'elevenlabs:*');
location.reload();
```

---

## ✅ Success Indicators

You'll know ElevenLabs is connected when you see:

### In Console:
```
🚀 Starting global ElevenLabs session for userId: user_abc123
✅ Got signed URL for userId: user_abc123
🎙️ Global ElevenLabs connected
🎙️ Speaking via ElevenLabs: Till number detected! 331701
```

### In App:
- Natural voice speaks (not robotic)
- Voice commands work
- Conversational responses
- Real-time balance updates

---

## 📞 Support

If still having issues:

1. **Check ElevenLabs Status**: [status.elevenlabs.io](https://status.elevenlabs.io)
2. **Review Docs**: [docs.elevenlabs.io](https://docs.elevenlabs.io)
3. **Check API Quota**: ElevenLabs dashboard → Usage
4. **Test API Key**: Use ElevenLabs API playground

---

**Remember:** The scanner works perfectly with browser TTS! ElevenLabs just makes the voice sound more natural. 🎯

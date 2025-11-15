# Voice Session & User Context Fix Guide

## Problem Summary

The ElevenLabs webhook is failing to find user information because:

1. ❌ **Tool config error**: `user_email` and `user_id` are set to `llm_prompt` instead of `dynamic_variable`
2. ❌ **No conversation context**: ElevenLabs doesn't know which user is speaking
3. ❌ **Voice sessions not found**: Database queries return 0 active sessions
4. ❌ **Falls back to test mode**: Results in 0 balance and failed transactions

## Root Cause

When you start a voice session, we pass user context in the signed URL:
```
wss://api.elevenlabs.io/...?user_id=xxx&user_email=yyy
```

But ElevenLabs **does NOT automatically forward these to webhook calls**. The AI has no way to know who the user is unless we configure it properly.

---

## Solution: 3-Step Fix

### Step 1: Update ElevenLabs Agent Configuration

Go to [ElevenLabs Dashboard](https://elevenlabs.io) → Your Agent → Tools → `send_money` tool

#### Update Query Parameters:

**Change `user_email` from:**
```json
{
  "id": "user_email",
  "type": "string",
  "value_type": "llm_prompt",  // ❌ WRONG - AI doesn't know this
  "description": "User Email"
}
```

**To:**
```json
{
  "id": "user_email",
  "type": "string",
  "value_type": "dynamic_variable",  // ✅ CORRECT
  "dynamic_variable": "user_email",
  "description": "User email from conversation context"
}
```

**Change `user_id` from:**
```json
{
  "id": "user_id",
  "type": "string",
  "value_type": "llm_prompt",  // ❌ WRONG
  "description": "User Id"
}
```

**To:**
```json
{
  "id": "user_id",
  "type": "string",
  "value_type": "dynamic_variable",  // ✅ CORRECT
  "dynamic_variable": "user_id",
  "description": "User ID from conversation context"
}
```

**Add conversation_id:**
```json
{
  "id": "conversation_id",
  "type": "string",
  "value_type": "system_provided",  // ✅ ElevenLabs provides this
  "is_system_provided": true,
  "description": "ElevenLabs conversation ID"
}
```

#### Configure Dynamic Variables Section:

In the tool's `dynamic_variables` section, add:
```json
{
  "dynamic_variable_placeholders": {
    "user_email": {
      "description": "User's email address from signed URL",
      "source": "query_param"
    },
    "user_id": {
      "description": "User's unique ID from signed URL",
      "source": "query_param"
    }
  }
}
```

### Step 2: Verify Voice Session Creation

Check that `/api/get-signed-url` is creating voice sessions properly.

**Test this:**
1. Open your app and start a voice session
2. Check Supabase → `voice_sessions` table
3. Verify there's a new row with:
   - ✅ `user_id` = your authenticated user ID
   - ✅ `session_id` = extracted from signed URL
   - ✅ `status` = 'active'
   - ✅ `expires_at` = 15 minutes from now
   - ✅ `signed_url` = full URL

**If no session is created:**
- Check browser console for errors when opening voice interface
- Check server logs for `/api/get-signed-url` errors
- Verify Supabase `voice_sessions` table exists (check schema)

### Step 3: Test the Full Flow

**Test Transaction:**
1. Login to your app: `https://ongeapesa.vercel.app`
2. Open voice interface (click mic button)
3. Wait for "Connected" status
4. Say: "Send 100 to 0712345678"
5. Watch the logs

**Expected Logs:**
```
✅ Got signed URL for userId: [uuid]
✅ Saved voice session: [session-id] for user: [email]
💰 Sending user context to ElevenLabs:
  - userId: [uuid]
  - userEmail: [email]
  - balance: [amount]
  - userName: [name]

[Later when webhook is called]
🔍 Looking up user by email: [email]
✅ Found user by email: {...}
💳 Debit transaction detected
✅ Balance sufficient
=== FORWARDING TO N8N ===
```

---

## How the Fixed Flow Works

### 1. User Opens Voice Interface
```typescript
// Frontend: contexts/ElevenLabsContext.tsx
const { signedUrl, userId, userEmail, balance } = await fetch('/api/get-signed-url')

// URL includes user context
const urlWithContext = `${signedUrl}&user_id=${userId}&user_email=${userEmail}&balance=${balance}`

// Start ElevenLabs session
await conversation.startSession({ signedUrl: urlWithContext })
```

### 2. Backend Creates Voice Session
```typescript
// Backend: app/api/get-signed-url/route.ts
await supabase.from('voice_sessions').insert({
  user_id: user.id,
  session_id: sessionId,
  signed_url: signedUrl,
  status: 'active',
  expires_at: new Date(Date.now() + 15 * 60 * 1000)
})
```

### 3. User Speaks Command
```
User: "Send 1000 to 0712345678"
```

### 4. ElevenLabs Calls Webhook with Context
```
POST https://ongeapesa.vercel.app/api/voice/webhook
  ?request=Send 1000 to 0712345678
  &user_email=ijepale@gmail.com        // ✅ From dynamic variable
  &user_id=550e8400-e29b-41d4-a716... // ✅ From dynamic variable
  &conversation_id=conv_abc123         // ✅ From system

Body:
{
  "type": "send_phone",
  "amount": "1000",
  "phone": "0712345678",
  "summary": "Send money to 0712345678"
}
```

### 5. Webhook Finds User
```typescript
// app/api/voice/webhook/route.ts

// Try 1: Look up by user_id from query param ✅
const profile = await supabase.from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// Try 2: Look up by email from query param ✅
const profile = await supabase.from('profiles')
  .select('*')
  .eq('email', userEmail)
  .single()

// Try 3: Look up from voice_sessions ✅
const session = await supabase.from('voice_sessions')
  .select('user_id, profiles(*)')
  .eq('session_id', conversationId)
  .eq('status', 'active')
  .single()
```

### 6. Webhook Validates & Forwards to n8n
```typescript
// Check balance
if (balance < totalRequired) {
  return { error: 'insufficient_funds' }
}

// Forward to n8n with full user context
await fetch(n8nWebhookUrl, {
  method: 'POST',
  body: JSON.stringify({
    ...body,
    user_id,
    user_email,
    user_phone,
    user_name,
    balance
  })
})
```

---

## Debugging Checklist

### If webhook shows "No user found"

- [ ] Check ElevenLabs tool config has `value_type: "dynamic_variable"`
- [ ] Verify dynamic variables are configured in ElevenLabs
- [ ] Check that user_email appears in webhook logs
- [ ] Verify user exists in `profiles` table with that email

### If webhook shows "No voice sessions found"

- [ ] Check `voice_sessions` table has recent rows
- [ ] Verify `status` = 'active' and `expires_at` is in future
- [ ] Check that `session_id` matches conversation_id from ElevenLabs
- [ ] Ensure RLS policies allow reading voice_sessions

### If shows "Auth session missing"

- [ ] This is normal - webhook doesn't need auth session
- [ ] It should fall back to lookup by email/user_id
- [ ] Check that fallback logic is working

### If balance is always 0

- [ ] Check `profiles.wallet_balance` in database
- [ ] Verify balance is being fetched in `/api/get-signed-url`
- [ ] Check that balance updates after deposits

---

## Quick Test Script

Run this in your browser console while on the voice interface:

```javascript
// Check if user context is being passed
const checkVoiceSetup = async () => {
  // 1. Get signed URL
  const signedUrl = await fetch('/api/get-signed-url', { method: 'POST' })
    .then(r => r.json());
  
  console.log('✅ Signed URL response:', signedUrl);
  
  // 2. Check voice sessions
  const sessions = await fetch('/api/user')
    .then(r => r.json());
  
  console.log('✅ User data:', sessions);
  
  return {
    hasUserId: !!signedUrl.userId,
    hasEmail: !!signedUrl.userEmail,
    hasBalance: signedUrl.balance !== undefined,
    signedUrl: signedUrl.signedUrl
  };
};

await checkVoiceSetup();
```

---

## Files Updated

- ✅ `app/api/voice/webhook/route.ts` - Created webhook handler
- ✅ `contexts/ElevenLabsContext.tsx` - Updated to pass user_email
- ✅ `app/api/get-signed-url/route.ts` - Already creates voice_sessions
- ✅ `docs/config/elevenlabs-tool-config-fixed.json` - Corrected configuration

---

## Next Steps

1. **Update ElevenLabs**: Copy config from `elevenlabs-tool-config-fixed.json`
2. **Deploy**: Push changes and deploy to Vercel
3. **Test**: Try a real voice transaction
4. **Monitor**: Check logs for user_email in webhook calls

**Expected Result:** Transactions should work with real user balance, no more test mode!

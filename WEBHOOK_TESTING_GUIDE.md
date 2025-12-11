# Webhook Testing & Logging Guide

## 🎯 How to Verify the Complete Flow

This guide shows you how to see the logs and verify that:
1. ✅ ElevenLabs is sending the request to your webhook
2. ✅ Your app receives user_email and user_id
3. ✅ Your app adds user context before sending to n8n
4. ✅ n8n receives the complete payload

---

## Step 1: Deploy Your Changes

```bash
# Commit and push the enhanced logging
git add .
git commit -m "Enhanced webhook logging for debugging"
git push

# Deploy to Vercel (or it auto-deploys if you have GitHub integration)
```

---

## Step 2: Open Vercel Logs (Real-time)

### Option A: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click on your project (`ongea-pesa`)
3. Click **"Deployments"** tab
4. Click on the latest deployment (should be green/ready)
5. Click **"Functions"** tab
6. Click on `api/voice/webhook`
7. You'll see a **"Logs"** button - click it

### Option B: Vercel CLI (Better for Real-time)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login
vercel login

# Tail logs in real-time
vercel logs --follow
```

This will show logs as they happen!

---

## Step 3: Make a Test Voice Call

1. Open your app: `https://your-app.vercel.app`
2. Login
3. Click the microphone button
4. Wait for "Connected"
5. Say: **"Send 100 to 0712345678"**

---

## Step 4: Check the Logs

You should see logs in this exact order:

### 📥 **1. Webhook Received (Lines 8-28)**

```
=== VOICE WEBHOOK CALLED ===
Timestamp: 2025-11-15T18:11:00.123Z
Request URL: https://ongeapesa.vercel.app/api/voice/webhook?request=Send%20100%20to%200712345678&user_email=ijepale@gmail.com&user_id=550e8400-e29b-41d4-a716-446655440000

📦 Request Body from ElevenLabs: {
  "type": "send_phone",
  "amount": "100",
  "phone": "0712345678",
  "summary": "Send 100 to 0712345678"
}

📝 Query Param - request: Send 100 to 0712345678
👤 Query Param - user_email: ijepale@gmail.com      ← Should be YOUR email
🆔 Query Param - user_id: 550e8400-e29b-41d4-a716... ← Should be YOUR user ID
💬 Conversation ID: conv_abc123xyz

🔍 VERIFYING: Did ElevenLabs send user_email? ✅ YES  ← THIS IS KEY!
🔍 VERIFYING: Did ElevenLabs send user_id? ✅ YES    ← THIS IS KEY!
```

**If you see ❌ NO for either**, then ElevenLabs tool is NOT configured correctly!

### 🔍 **2. User Lookup (Lines 38-74)**

```
🔍 Looking up user by user_id: 550e8400-e29b-41d4-a716...
✅ Found user by user_id: {
  user_id: '550e8400-e29b-41d4-a716...',
  user_email: 'ijepale@gmail.com',
  user_phone: '254712345678',
  user_name: 'John Doe',
  balance: 50000
}
```

### 💳 **3. Balance Check (Lines 186-215)**

```
=== BALANCE VALIDATION ===
💳 Debit transaction detected
Type: send_phone
Amount: 100
Platform Fee: 0.5
Total Required: 100.5
Current Balance: 50000
✅ Balance sufficient
```

### 📤 **4. Enriched Payload (Lines 250-263)**

**THIS IS THE MOST IMPORTANT PART - Shows what we're adding:**

```
=== FORWARDING TO N8N ===
📤 ENRICHED PAYLOAD (with user context added):
   ├─ Original from ElevenLabs: {
   │    "type": "send_phone",
   │    "amount": "100",
   │    "phone": "0712345678",
   │    "summary": "Send 100 to 0712345678"
   │  }
   ├─ Added user_id: 550e8400-e29b-41d4-a716-446655440000
   ├─ Added user_email: ijepale@gmail.com
   ├─ Added user_phone: 254712345678
   ├─ Added user_name: John Doe
   └─ Added balance: 50000

🎯 n8n URL: https://your-n8n.railway.app/webhook/...

📨 Complete Payload to n8n: {
  "type": "send_phone",
  "amount": "100",
  "phone": "0712345678",
  "summary": "Send 100 to 0712345678",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",    ← WE ADDED THIS
  "user_email": "ijepale@gmail.com",                     ← WE ADDED THIS
  "user_phone": "254712345678",                          ← WE ADDED THIS
  "user_name": "John Doe",                               ← WE ADDED THIS
  "original_request": "Send 100 to 0712345678",
  "conversation_id": "conv_abc123xyz",
  "timestamp": "2025-11-15T18:11:00.456Z",
  "platform": "ongea_pesa_voice",
  "platform_fee": 0.5,
  "is_free_transaction": false,
  "current_balance": 50000                               ← WE ADDED THIS
}
```

### ✅ **5. n8n Response (Lines 273-275)**

```
n8n Response Status: 200
n8n Response: {
  "success": true,
  "transaction_id": "txn_123abc",
  "message": "Transaction processed successfully"
}
```

---

## What Each Section Tells You

### Section 1: Webhook Received
**Verifies:** ElevenLabs successfully called your webhook

**If you see this:** ✅ Webhook is working

**If you DON'T see this:**
- Check webhook URL in ElevenLabs matches your Vercel URL
- Verify tool is configured correctly
- Check ElevenLabs isn't showing errors

### Section 2: User Lookup
**Verifies:** Your app can find the user in database

**If you see this:** ✅ User authentication working

**If you DON'T see this:**
- user_email or user_id might be empty (check Section 1)
- User might not exist in profiles table
- Dynamic variables not configured in ElevenLabs

### Section 3: Balance Check
**Verifies:** User has sufficient funds

**If you see this:** ✅ Balance checking working

**If transaction fails here:**
- User needs to add money to wallet
- Check balance in Supabase profiles table

### Section 4: Enriched Payload
**Verifies:** Your app is adding user context before sending to n8n

**If you see this:** ✅ **THIS IS WHAT YOU WANT TO SEE!**

**This shows:**
- What ElevenLabs sent (minimal info)
- What we're adding (user_id, email, phone, name, balance)
- Complete payload going to n8n

### Section 5: n8n Response
**Verifies:** n8n received the request and processed it

**If you see this:** ✅ Complete flow working end-to-end!

**If you DON'T see this:**
- Check n8n URL is correct
- Verify n8n webhook is active
- Check n8n logs for errors

---

## Common Log Patterns

### ✅ Success Pattern

```
=== VOICE WEBHOOK CALLED ===
🔍 VERIFYING: Did ElevenLabs send user_email? ✅ YES
🔍 VERIFYING: Did ElevenLabs send user_id? ✅ YES
✅ Found user by user_id: {...}
✅ Balance sufficient
=== FORWARDING TO N8N ===
📨 Complete Payload to n8n: {...}
n8n Response Status: 200
=== WEBHOOK COMPLETED ===
```

### ❌ Missing User Context Pattern

```
=== VOICE WEBHOOK CALLED ===
🔍 VERIFYING: Did ElevenLabs send user_email? ❌ NO    ← PROBLEM!
🔍 VERIFYING: Did ElevenLabs send user_id? ❌ NO       ← PROBLEM!
⚠️ No user context found, checking voice_sessions...
❌ No active voice sessions found
⚠️ Using test mode with zero balance
```

**FIX**: Configure Dynamic Variables in ElevenLabs tool (see ELEVENLABS_UI_SETUP_GUIDE.md Part 6)

### ❌ Insufficient Funds Pattern

```
=== BALANCE VALIDATION ===
❌ INSUFFICIENT FUNDS
Balance: 0
Required: 100.5
Shortfall: 100.5
```

**FIX**: Add money to user's wallet or deposit test funds

---

## Testing Checklist

Before each test, verify:

- [ ] Webhook URL in ElevenLabs matches your Vercel URL
- [ ] Dynamic variables configured (`user_email`, `user_id`)
- [ ] User exists in Supabase `profiles` table
- [ ] User has sufficient wallet balance
- [ ] n8n webhook URL is correct in environment variables
- [ ] Vercel logs are open and ready

---

## Quick Test Command

To quickly test if webhook is receiving requests:

```bash
# Terminal 1: Watch Vercel logs
vercel logs --follow

# Terminal 2: Make a test call
curl -X POST https://your-app.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "100",
    "phone": "0712345678",
    "summary": "Test transaction"
  }' \
  "?request=Test&user_email=test@example.com&user_id=test-uuid-123"
```

You should see all the logs appear!

---

## Debugging Tips

### 1. If logs don't appear:
- Refresh Vercel dashboard
- Try `vercel logs --follow` in terminal
- Check you're viewing the correct deployment

### 2. If user_email is empty:
- Go to ElevenLabs → Your Agent → Tools → send_money
- Check Query Parameters tab
- Verify `user_email` uses `Dynamic Variable` type
- Save and test again

### 3. If balance is always 0:
- Check Supabase → profiles table → wallet_balance column
- Run a test deposit first
- Verify user_id matches between app and database

### 4. If n8n doesn't receive:
- Check n8n logs in Railway dashboard
- Verify webhook URL is correct
- Test n8n webhook with curl directly

---

## Success Criteria

Your integration is working correctly when you see:

✅ **Line 27**: `🔍 VERIFYING: Did ElevenLabs send user_email? ✅ YES`
✅ **Line 28**: `🔍 VERIFYING: Did ElevenLabs send user_id? ✅ YES`
✅ **Line 50**: `✅ Found user by user_id: {...}`
✅ **Line 215**: `✅ Balance sufficient`
✅ **Lines 251-257**: Shows enriched payload with all user data added
✅ **Line 273**: `n8n Response Status: 200`

**If you see all of these, your webhook is working perfectly!** 🎉

---

## Next Steps

Once you confirm logs are showing correctly:

1. Test different transaction types (send, paybill, till)
2. Test with different amounts
3. Verify transactions appear in n8n
4. Check database for transaction records
5. Monitor production logs regularly

Your webhook is now fully instrumented and ready for production! 🚀

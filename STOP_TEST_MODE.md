# 🛑 Stop Test Mode - Get Real User Data

## ❌ Current Problem

n8n is receiving test data:
```json
{
  "user_id": "test-user-id",
  "user_email": "test@ongeapesa.com",
  "user_phone": "254712345678",
  "user_name": "Test User"
}
```

## 🎯 Root Cause

ElevenLabs calls the webhook **without browser session cookies**, so:
1. ❌ No browser session available
2. ❌ No `?user_email=` query parameter 
3. ❌ voice_sessions lookup failing (sessions not being created or already expired)

---

## ✅ Solution: 3 Options (Choose Best for You)

### Option 1: Manual Email in ElevenLabs URL (Fastest - 1 min)

**Best for:** Testing, single user

**Update your ElevenLabs webhook URL to:**
```
https://d3c0ff66f0f3.ngrok-free.app/api/voice/webhook?user_email=ijepale@gmail.com
```

**Steps:**
1. Go to ElevenLabs Dashboard → Your Agent
2. Click **Tools** → **send_money** webhook
3. Update URL to include `?user_email=YOUR_EMAIL`
4. Save

**Result:** ✅ Webhook will find user by email every time

---

### Option 2: Fix voice_sessions Lookup (Best - 5 min)

**Best for:** Production, multiple users

**The issue:** voice_sessions might not be getting created or are expiring too fast.

#### Step A: Verify Sessions Are Being Created

1. Login at `localhost:3000`
2. Open voice interface
3. Check Next.js logs for:
```
Generating signed URL for user: your@email.com
Saved voice session: session-123 for user: your@email.com
```

4. Check database:
```sql
SELECT * FROM voice_sessions 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**If NO sessions:** There's an issue with session creation.

#### Step B: Check Session Expiration

Sessions expire after 15 minutes. If you start voice session, then wait >15 min before speaking, session is expired.

**Solution:** Reduce expiration check or extend session time:

In `/api/get-signed-url/route.ts`, change:
```typescript
expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
```

To:
```typescript
expires_at: new Date(Date.now() + 60 * 60 * 1000) // 60 minutes
```

#### Step C: Test with Detailed Logs

After restarting:
```bash
npm run dev
```

Watch logs when webhook is called:
```
🔍 Looking up user from recent voice sessions
Total recent voice sessions: 1
Recent sessions: [
  {
    "user_id": "YOUR_UUID",
    "session_id": "session-123",
    "status": "active",
    "expires_at": "2025-10-04T15:00:00Z"
  }
]
✅ Found active voice session, user_id: YOUR_UUID
✅ Found user from session: your@email.com
```

**If you see "Total recent voice sessions: 0":**
- Sessions aren't being created
- Check if Supabase connection works
- Check if RLS policies allow inserts

---

### Option 3: Use In-Memory Session Store (Advanced - 10 min)

**Best for:** When voice_sessions table doesn't work

Create a simple in-memory store:

```typescript
// app/api/session-store.ts
const sessions = new Map<string, { userId: string, email: string, expires: number }>();

export function setUserSession(email: string, userId: string) {
  const sessionKey = `${email}-${Date.now()}`;
  sessions.set(email, {
    userId,
    email,
    expires: Date.now() + 60 * 60 * 1000 // 1 hour
  });
  return sessionKey;
}

export function getUserSession(email?: string) {
  // Clean expired
  for (const [key, value] of sessions) {
    if (value.expires < Date.now()) {
      sessions.delete(key);
    }
  }
  
  // If email provided, return that
  if (email && sessions.has(email)) {
    return sessions.get(email);
  }
  
  // Otherwise return most recent
  const recent = Array.from(sessions.values())
    .sort((a, b) => b.expires - a.expires)[0];
  
  return recent;
}
```

Then update `/api/get-signed-url` and `/api/voice/webhook` to use this.

---

## 🧪 Quick Test to Find the Issue

### Test 1: Check if Sessions Are Created

```bash
# While voice interface is open, run:
curl http://localhost:3000/api/user
```

Should return your user info. If not, you're not logged in.

### Test 2: Check Database

```sql
-- Are there any sessions?
SELECT COUNT(*) FROM voice_sessions;

-- Are there recent sessions?
SELECT * FROM voice_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Are there ACTIVE sessions?
SELECT * FROM voice_sessions 
WHERE status = 'active' 
  AND expires_at > NOW();
```

### Test 3: Check RLS Policies

```sql
-- Can your user insert sessions?
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'voice_sessions';
```

Make sure there's a policy for INSERT.

---

## ✅ Recommended: Hybrid Approach

**Combine Option 1 + Option 2:**

1. **Add email to ElevenLabs URL** (immediate fix)
   ```
   ?user_email=your@email.com
   ```

2. **Fix voice_sessions** (long-term solution)
   - Extend expiration to 60 minutes
   - Add better error handling
   - Check RLS policies

3. **Keep test mode as fallback** (safety net)
   - Current code already does this

---

## 🎯 Expected Result After Fix

### Console Logs:
```
=== VOICE WEBHOOK CALLED ===
Query Param - user_email: ijepale@gmail.com
🔍 Looking up user by email: ijepale@gmail.com
✅ Found user by email: ijepale@gmail.com
✅ User context: {
  id: "b8c5a1f0-...",
  email: "ijepale@gmail.com",
  wallet_balance: 10000,
  phone: "254712345678"
}

=== FORWARDING TO N8N ===
N8N Payload: {
  "body": {
    "user_id": "b8c5a1f0-...",  ← REAL USER ID!
    "user_email": "ijepale@gmail.com",  ← REAL EMAIL!
    "user_phone": "254712345678",
    "type": "buy_goods_pochi",
    "amount": 3000,
    ...
  }
}
```

### n8n Receives:
```json
{
  "user_id": "b8c5a1f0-...",     ✅ REAL!
  "user_email": "ijepale@gmail.com",  ✅ REAL!
  "user_phone": "254712345678",   ✅ REAL!
}
```

### Database Updates:
```sql
-- Transaction linked to REAL user
SELECT user_id, type, amount FROM transactions ORDER BY created_at DESC LIMIT 1;
-- user_id: b8c5a1f0-... (YOUR actual UUID)

-- Balance updated for REAL user  
SELECT wallet_balance FROM profiles WHERE id = 'b8c5a1f0-...';
-- 10000 → 7000 (after 3000 deduction)
```

---

## 🚀 Quick Action Plan

**Right now (1 minute):**
1. Update ElevenLabs webhook URL to: `...?user_email=YOUR_EMAIL`
2. Test: Say "Send 100 to 0712345678"
3. Check n8n - should see YOUR real user_id

**Next (5 minutes):**
1. Run the SQL tests above
2. Check if voice_sessions are being created
3. If not, check Supabase RLS policies

**Finally:**
1. Review logs with detailed debugging
2. Fix any voice_sessions issues
3. Remove `?user_email=` from URL (automatic lookup works)

---

## 📖 Debug Commands

```bash
# Check if user is logged in
curl http://localhost:3000/api/user

# Check user balance
curl http://localhost:3000/api/balance

# Get signed URL (requires login)
curl http://localhost:3000/api/get-signed-url
```

```sql
-- Check voice sessions
SELECT 
  session_id,
  user_id,
  status,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_active
FROM voice_sessions
ORDER BY created_at DESC
LIMIT 5;

-- Check user profile
SELECT id, phone_number, wallet_balance 
FROM profiles 
WHERE phone_number = 'YOUR_PHONE';
```

---

**Start with Option 1 (add email to URL) for immediate fix, then investigate Option 2 for permanent solution!** 🚀

# Voice Session User Identification Fix

## 🔴 Issues Identified (Nov 15, 2025)

### Issue #1: ElevenLabs Not Sending User Context
```
Query Param - user_email: undefined
Query Param - user_id: undefined
Conversation ID: undefined
```

**Problem**: ElevenLabs webhook calls don't include user identification data.

### Issue #2: Expired Voice Session
```
created_at: "2025-10-04T14:27:33.158264+00:00"
expires_at: "2025-10-04T14:42:31.561+00:00"
Current time: "2025-11-15T16:57:39.718Z"
```

**Problem**: The voice session in database expired **42 days ago**. The webhook looks for active sessions but finds none.

### Issue #3: Test User Fallback with Zero Balance
```
user_id: test-user-id
user_email: test@ongeapesa.com
Current Balance: 0
❌ INSUFFICIENT FUNDS
```

**Problem**: Because no real user is found, system uses test user with zero balance, causing all transactions to fail.

---

## ✅ Solutions Implemented

### Fix #1: Extended Voice Session Duration
**File**: `app/api/get-signed-url/route.ts`

**Changes**:
- ✅ Sessions now expire after **60 minutes** (was 15 minutes)
- ✅ Old active sessions are automatically ended when new session starts
- ✅ Prevents multiple active sessions per user

```typescript
// First, deactivate any existing active sessions for this user
await supabase
  .from('voice_sessions')
  .update({ 
    status: 'ended',
    ended_at: new Date().toISOString()
  })
  .eq('user_id', user.id)
  .eq('status', 'active');

// Now create new session with 60-minute expiry
await supabase
  .from('voice_sessions')
  .insert({
    user_id: user.id,
    session_id: sessionId,
    agent_id: agentId,
    signed_url: signedUrl,
    status: 'active',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 minutes
  });
```

### Fix #2: Enhanced User Email Lookup
**File**: `app/api/voice/webhook/route.ts`

**Changes**:
- ✅ Webhook now fetches real user email from `auth.users`
- ✅ No longer relies on fallback email addresses
- ✅ Properly identifies users from active sessions

```typescript
// Get auth user to get real email
const { data: { users }, error: authListError } = await supabase.auth.admin.listUsers()
if (!authListError && users) {
  const authUser = users.find(u => u.id === recentSession.user_id)
  if (authUser) {
    finalUserEmail = authUser.email
    console.log('✅ Found auth user email:', finalUserEmail)
  }
}
```

---

## 🧪 Testing Steps

### Step 1: Clear Old Sessions
Before testing, clean up old expired sessions:

```sql
-- In Supabase SQL Editor
UPDATE voice_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'active' 
AND expires_at < NOW();
```

### Step 2: Start Fresh Voice Session
1. **Log out** and **log back in** to your app
2. Go to the voice interface (home page)
3. **Wait for voice connection** to establish
4. Check browser console for: `✅ Saved voice session: ... for user: YOUR_EMAIL expires in 60 minutes`

### Step 3: Make a Test Transaction
1. Say: **"Send 100 to 0712345678"**
2. Check server logs for:
   - ✅ `Found active voice session, user_id: YOUR_USER_ID`
   - ✅ `Found auth user email: YOUR_EMAIL`
   - ✅ `Current wallet balance: YOUR_BALANCE`

### Step 4: Verify in Debug Dashboard
Visit `/debug` and check:
- **Webhook Logs**: Should show your real user_id (not `test-user-id`)
- **System Status**: All services should be green
- **User Context**: Should show your actual email

---

## 🎯 Expected Behavior Now

### Before Fix ❌
```
user_id: test-user-id
user_email: test@ongeapesa.com
Balance: 0
❌ INSUFFICIENT FUNDS
```

### After Fix ✅
```
user_id: b970bef4-4852-4bce-b424-90a64e2d922f
user_email: YOUR_ACTUAL_EMAIL@example.com
Balance: YOUR_ACTUAL_BALANCE
✅ BALANCE CHECK PASSED
```

---

## 🚨 Important Notes

### Session Expiry
- Voice sessions now last **60 minutes**
- After 60 minutes, you must **refresh the voice interface** to create a new session
- Opening the voice interface automatically creates a session

### Multi-User Scenario
- Each user gets their own voice session
- Old sessions are automatically ended when user starts a new one
- Webhook always uses the most recent active session

### Balance Check
- Transactions **will fail** if you have insufficient funds
- Make sure to **add funds** to your wallet before testing
- Minimum amount: Platform fee (0.5% of transaction amount)

---

## 🔧 Troubleshooting

### Issue: Still getting "test-user-id"

**Solution**:
1. Clear all active sessions in database (see Step 1)
2. Log out completely
3. Log back in
4. Open voice interface
5. Wait for connection
6. Try transaction again

### Issue: "No active voice sessions found"

**Solution**:
1. Make sure you're **logged in**
2. Visit the **voice interface** (/) at least once
3. Wait for **"ElevenLabs connected"** message
4. Check browser console for session creation log
5. Try transaction after connection is established

### Issue: Session expires too quickly

**Solution**:
- Sessions now last 60 minutes
- If you need longer, edit `app/api/get-signed-url/route.ts` line 141:
  ```typescript
  expires_at: new Date(Date.now() + 120 * 60 * 1000).toISOString(), // 120 minutes
  ```

---

## 📊 Monitoring

### Check Voice Sessions
```sql
SELECT 
  id,
  user_id,
  session_id,
  status,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as validity
FROM voice_sessions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

### Check User Profiles
```sql
SELECT 
  id,
  email,
  phone_number,
  wallet_balance,
  subscription_status
FROM profiles
WHERE id = 'YOUR_USER_ID';
```

---

## 🎉 Summary

**What was fixed**:
1. ✅ Extended session duration from 15 to 60 minutes
2. ✅ Auto-cleanup of old active sessions
3. ✅ Proper user email lookup from auth.users
4. ✅ Better logging for debugging

**What you need to do**:
1. 🔄 Restart your Next.js server
2. 🗑️ Clear old expired sessions
3. 🔐 Log out and log back in
4. 🎤 Open voice interface to create new session
5. 💰 **Add funds to your wallet** (balance was 0!)
6. 🧪 Test transaction

**The insufficient funds error was legitimate** - you need to add money to your wallet before making transactions!

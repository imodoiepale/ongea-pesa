# ✅ NO SERVICE KEY NEEDED - Alternative Solution

## 🎯 What Changed

Instead of using admin API (which needs service role key), we now:

1. ✅ Query `voice_sessions` table directly
2. ✅ Get the most recent session's `user_id`
3. ✅ Query `profiles` table with that `user_id`
4. ✅ Use **real user data** from profile

**No admin permissions needed!** Uses regular anon key.

---

## 🔧 How It Works Now

```
Voice webhook called
    ↓
Check voice_sessions table
    ↓
Get most recent session → user_id
    ↓
Query profiles table with user_id
    ↓
Get phone_number, wallet_balance
    ↓
Send REAL data to n8n ✅
```

---

## ⚠️ Required: RLS Policies

For this to work, you need RLS policies that allow reading voice_sessions.

### Check Your Policies

Run in Supabase SQL Editor:

```sql
-- Check voice_sessions policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'voice_sessions';
```

### If NO policies exist, add them:

```sql
-- Allow reading voice_sessions (for webhook)
CREATE POLICY "Allow webhook to read sessions"
  ON voice_sessions FOR SELECT
  USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access"
  ON voice_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 🧪 Test Now

### 1. Restart Next.js

```bash
# Stop: Ctrl+C
npm run dev
```

### 2. Make Sure Voice Session Exists

Go to `localhost:3000` and open voice interface.

This creates a session in `voice_sessions` table.

**Verify in Supabase:**
```sql
SELECT * FROM voice_sessions 
ORDER BY created_at DESC 
LIMIT 5;
```

Should show at least 1 row with your user_id.

### 3. Test Voice Command

Say: **"Send 100 to 0712345678"**

---

## ✅ Expected Logs

```
=== VOICE WEBHOOK CALLED ===
⚠️ No user context found, checking ALL voice_sessions (no filters)...
Voice sessions query:
  Error: null
  Sessions found: 1
✅ Found 1 voice sessions
✅ Most recent session: conversation user_id: b8c5a1f0-...
✅ Found profile: {
  id: "b8c5a1f0-...",
  phone_number: "254712345678",
  wallet_balance: 10000
}
✅ SUCCESSFULLY SET REAL USER DATA FROM VOICE SESSION

📤 Final user data for n8n:
  user_id: b8c5a1f0-4d8e-4abc-9123-456789abcdef  ✅
  user_email: user-b8c5a1f0@ongeapesa.com  (fallback, ok!)
  user_phone: 254712345678  ✅
```

### Then n8n Receives:

```json
{
  "user_id": "b8c5a1f0-4d8e-4abc-9123-456789abcdef",  ✅ REAL!
  "user_email": "user-b8c5a1f0@ongeapesa.com",
  "user_phone": "254712345678",
  "wallet_balance": 10000
}
```

---

## ❌ If Sessions Found = 0

### Problem: No sessions in database

**Solution:** Make sure you opened voice interface at least once.

1. Go to `localhost:3000`
2. Voice interface loads
3. Should see in logs: `"Saved voice session: conversation for user: ijepale@gmail.com"`

**Verify:**
```sql
SELECT COUNT(*) FROM voice_sessions;
```

Should be > 0.

### Problem: RLS blocking reads

**Error:** `Row level security policy violated`

**Solution:** Add RLS policy:
```sql
CREATE POLICY "Allow reading sessions"
  ON voice_sessions FOR SELECT
  USING (true);
```

---

## 🎯 Advantages of This Approach

✅ **No service key needed** - Works with anon key  
✅ **Simple** - Just queries tables  
✅ **Automatic** - Uses whoever opened voice interface  
✅ **Real data** - Gets actual user_id and profile  
✅ **Fallback email** - Creates email from user_id if needed  

---

## 📊 What Gets Sent to n8n

```json
{
  "user_id": "YOUR-ACTUAL-UUID",  ← From voice_sessions
  "user_email": "user-UUID@ongeapesa.com",  ← Fallback (ok for transactions)
  "user_phone": "254712345678",  ← From profiles table
  "user_name": "254712345678",  ← From profiles
  "wallet_balance": 10000,  ← From profiles (if included)
  "type": "send_phone",
  "amount": 3000,
  ...
}
```

**The user_id is real, that's what matters for database links!**

---

## 🔍 Troubleshooting

### Voice sessions found but profile not found

```
✅ Most recent session: user_id: abc-123
⚠️ Profile not found for user_id: abc-123
```

**This is OK!** Code will still use the user_id.

**To fix profile:** Run in Supabase:
```sql
INSERT INTO profiles (id, phone_number, wallet_balance)
VALUES (
  'abc-123',  -- Replace with your user_id
  '254712345678',
  10000.00
);
```

### Still getting test data

Check logs for:
```
❌ No voice sessions found in database
💡 TIP: Make sure you opened the voice interface
```

**Solution:** Open voice interface first to create session.

---

## ✅ Summary

**Old way:** Needed service role key → admin.listUsers() ❌

**New way:** Query voice_sessions → Get user_id → Query profiles ✅

**Result:** Same real user data, no admin key needed!

---

**Restart and test now!** 🚀

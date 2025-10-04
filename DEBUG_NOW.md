# 🔍 Debug With New Logs - Test Now

## ✅ New Logging Added

The webhook now shows EXACTLY why the fallback is failing.

## 🧪 Test Steps

### 1. Restart Next.js

```bash
# Stop: Ctrl+C
npm run dev
```

### 2. Test Voice Command

Say: **"Send 100 to 0712345678"**

### 3. Check Logs - You'll See One of These:

#### ✅ **Success Case:**
```
⚠️ No user context found, fetching most recent user from database
🔍 Calling supabase.auth.admin.listUsers()...
List users result:
  Error: null
  Users count: 1
✅ Found 1 users in database
Users: [ { email: 'ijepale@gmail.com', last_sign_in: '2025-10-04...' } ]
✅ Most recent user: ijepale@gmail.com ID: b8c5a1f0-...
🔍 Fetching profile for user: b8c5a1f0-...
⚠️ Profile not found (this is OK): Cannot coerce the result to a single JSON object
Using user data without profile
✅ SUCCESSFULLY SET REAL USER DATA

📤 Final user data for n8n:
  user_id: b8c5a1f0-real-uuid-here  ✅
  user_email: ijepale@gmail.com  ✅
```

#### ❌ **Failure Case A: No Permission**
```
⚠️ No user context found, fetching most recent user from database
🔍 Calling supabase.auth.admin.listUsers()...
List users result:
  Error: { message: 'JWT invalid' }  ❌
  Users count: 0
❌ Error listing users: JWT invalid
```

**Fix:** Your service role key is wrong or missing.

#### ❌ **Failure Case B: No Users**
```
List users result:
  Error: null
  Users count: 0
❌ No users found in database or error occurred
```

**Fix:** You haven't created an account yet.

---

## 🎯 Expected Result

### You Should See:
```
✅ SUCCESSFULLY SET REAL USER DATA
📤 Final user data for n8n:
  user_id: YOUR-REAL-UUID
  user_email: YOUR-REAL-EMAIL
```

### Then n8n Receives:
```json
{
  "user_id": "YOUR-REAL-UUID",  ✅ NOT test-user-id
  "user_email": "YOUR-REAL-EMAIL"  ✅ NOT test@ongeapesa.com
}
```

---

## 🐛 If It Fails

### Check 1: Service Role Key

Do you have this in your environment?

**Windows (PowerShell):**
```powershell
# Check if variable exists
Get-Content .env.local | Select-String "SERVICE_ROLE"
```

**Should see:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**If NOT there:** Add it to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get it from: Supabase Dashboard → Settings → API → `service_role` secret

### Check 2: User Exists

Run in Supabase SQL Editor:
```sql
SELECT id, email, last_sign_in_at, created_at
FROM auth.users
ORDER BY created_at DESC;
```

**Should return:** At least 1 user (you!)

**If 0 rows:** Create account at `localhost:3000/login`

### Check 3: Profile Table

```sql
-- Check if profile exists
SELECT id, phone_number, wallet_balance
FROM profiles
WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);
```

**If 0 rows:** Profile doesn't exist (but this is OK now - the code handles it)

**To create profile:**
```sql
INSERT INTO profiles (id, phone_number, wallet_balance)
SELECT 
  id, 
  COALESCE(phone, '254712345678'),
  10000.00
FROM auth.users 
WHERE email = 'your@email.com';
```

---

## 📊 What the Logs Will Tell You

| Log | Meaning | Action |
|-----|---------|--------|
| `Error: JWT invalid` | Service role key wrong | Fix .env.local |
| `Users count: 0` | No users in database | Sign up at /login |
| `✅ Found X users` | Good! | Check next log |
| `✅ SUCCESSFULLY SET REAL USER DATA` | **SUCCESS!** | Check Final user data |
| `Final user_id: test-user-id` | **FAILED** | Look at errors above |

---

## ⚡ Quick Test Command

```bash
# Restart
npm run dev

# Wait for Ready, then test
```

Say: **"Send 100 to 0712345678"**

**Look for:** `✅ SUCCESSFULLY SET REAL USER DATA`

**Then check:** `user_id:` should be a real UUID, not "test-user-id"

---

**Test now and show me the new detailed logs!** 🔍

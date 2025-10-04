# 🚨 URGENT FIX - Do This NOW

## ⚡ The Problem

Your `profiles` table has `phone_number` as **NOT NULL**, but we're trying to insert NULL values.

**Error:**
```
null value in column "phone_number" violates not-null constraint
```

---

## ✅ Solution (3 Minutes)

### Step 1: Run URGENT_FIX_NOW.sql

**In Supabase SQL Editor:**
```sql
-- Copy and paste ENTIRE file: URGENT_FIX_NOW.sql
```

**This will:**
1. ✅ Remove NOT NULL constraint from phone_number
2. ✅ Create your profile with proper defaults
3. ✅ Sync balance from transactions (if any)
4. ✅ Verify everything worked

---

### Step 2: Run AUTO_CREATE_PROFILE_TRIGGER.sql

**In Supabase SQL Editor:**
```sql
-- Copy and paste: AUTO_CREATE_PROFILE_TRIGGER.sql
```

**This will:**
1. ✅ Create trigger for future users
2. ✅ Backfill any other missing profiles
3. ✅ Prevent this error from happening again

---

### Step 3: Refresh Your App

```bash
# In browser, refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
```

**Expected Result:**
- ✅ No more errors
- ✅ Balance loads instantly
- ✅ Profile exists
- ✅ Can add balance

---

## 🧪 Verify It Worked

### Check in Supabase:

```sql
-- Should return your profile
SELECT 
  id,
  email,
  wallet_balance,
  phone_number
FROM profiles
WHERE email = 'ijepale@gmail.com';
```

**Expected:**
```
✅ id: b970bef4-4852-4bce-b424-90a64e2d922f
✅ email: ijepale@gmail.com
✅ wallet_balance: 0 (or calculated from transactions)
✅ phone_number: NULL (can add later)
```

---

## 📋 What Happened?

### Before:
```sql
CREATE TABLE profiles (
  phone_number TEXT NOT NULL  ← PROBLEM!
)
```

### After:
```sql
CREATE TABLE profiles (
  phone_number TEXT NULL  ← FIXED!
)
```

**Why?** Users might not have phone numbers when they first sign up (OAuth, email-only, etc.)

---

## 🎯 Order Matters!

**Run in this order:**

1. **FIRST:** `URGENT_FIX_NOW.sql` ← Fixes current user
2. **SECOND:** `AUTO_CREATE_PROFILE_TRIGGER.sql` ← Prevents future issues
3. **THIRD:** Refresh app ← Test it works

---

## ✅ After This, You'll Have:

- ✅ Profile exists for your user
- ✅ Balance shows correctly
- ✅ No more NOT NULL errors
- ✅ Future users auto-get profiles
- ✅ App works immediately

---

## 🐛 If Still Not Working:

### Check Console:
```
✅ Should see: "Balance loaded: X"
❌ Should NOT see: "Error creating profile"
```

### Check Database:
```sql
-- Should return 1 row
SELECT COUNT(*) FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

### Re-run if needed:
```sql
-- Safe to run multiple times
Run: URGENT_FIX_NOW.sql (it has ON CONFLICT DO UPDATE)
```

---

## 🚀 Quick Command

**In Supabase SQL Editor, run these in order:**

```sql
-- 1. Fix schema + create profile
-- Paste: URGENT_FIX_NOW.sql

-- 2. Setup trigger for future
-- Paste: AUTO_CREATE_PROFILE_TRIGGER.sql
```

**Then refresh browser!** ✨

---

**This should fix everything in under 3 minutes!** ⚡

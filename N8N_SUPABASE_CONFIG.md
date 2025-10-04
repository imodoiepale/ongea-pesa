# 🔧 n8n Supabase Configuration - Fix RLS Error

## ❌ Current Error

```
Authorization failed - please check your credentials: 
new row violates row-level security policy for table "transactions"
```

**Problem:** n8n is using the **anon key** which doesn't bypass RLS. It needs the **service role key**.

---

## ✅ Solution (2 Steps)

### Step 1: Run SQL to Add RLS Policies

In **Supabase SQL Editor**, run the entire `TRANSACTIONS_RLS_FIX.sql` file.

This adds policies to allow service role to insert transactions.

---

### Step 2: Update n8n Supabase Credential

#### **Option A: Update Existing Credential**

1. Go to **n8n** → **Credentials**
2. Find your **Supabase** credential
3. Click **Edit**
4. **Change the Service Role Key:**

   **Current (Wrong):**
   ```
   API Key: eyJhbG...  ← This is the ANON key
   ```

   **New (Correct):**
   ```
   API Key: eyJhbG...  ← Use SERVICE ROLE key
   ```

5. Get your **Service Role Key** from:
   - Supabase Dashboard → Settings → API
   - Look for **service_role** (secret) key
   - Click 👁️ to reveal
   - Copy it

6. Paste in n8n credential
7. Click **Save**

---

#### **Option B: Create New Credential (Recommended)**

1. In n8n → **Credentials** → **New Credential**
2. Search for **Supabase**
3. Fill in:
   ```
   Name: Supabase Service Role
   Host: https://YOUR-PROJECT.supabase.co
   API Key: eyJhbG... ← SERVICE ROLE KEY (not anon!)
   ```
4. **Save**
5. Update your Supabase nodes to use this new credential

---

## 🔍 How to Get Service Role Key

### From Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Settings** → **API**
4. Scroll to **Project API keys**
5. Find **service_role** section
6. Click the **👁️ icon** to reveal key
7. **Copy** the key (starts with `eyJ...`)

**Important:** It should say **"This key has the ability to bypass Row Level Security."**

---

## 🎯 After Updating

### Test in n8n:

1. **Save** the updated credential
2. **Re-run** your workflow
3. The insert should work now! ✅

---

## ✅ Expected Result

### Before (Error):
```
❌ Error: new row violates row-level security policy for table "transactions"
```

### After (Success):
```
✅ Row created successfully
{
  "id": "uuid-here",
  "user_id": "b970bef4-...",
  "type": "send_phone",
  "amount": 5000,
  "status": "pending"
}
```

---

## 🔒 Security Note

**Service Role Key:**
- ✅ Can bypass RLS (needed for n8n)
- ⚠️ Very powerful - can do anything!
- 🔒 **NEVER** expose in client-side code
- ✅ Safe to use in n8n (server-side)
- ✅ Safe to use in Next.js API routes (server-side)

**Keep it secret!** Don't commit to GitHub or share publicly.

---

## 📋 Quick Checklist

- [ ] Run `TRANSACTIONS_RLS_FIX.sql` in Supabase
- [ ] Get service_role key from Supabase Dashboard
- [ ] Update n8n Supabase credential with service_role key
- [ ] Test workflow again
- [ ] Should work! ✅

---

## 🧪 Test Query

After fixing, test in Supabase SQL Editor:

```sql
-- This should work now
INSERT INTO transactions (
  user_id,
  type,
  amount,
  phone,
  status
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'send_phone',
  100.00,
  '254712345678',
  'pending'
);

-- Check it was created
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 🎉 You're Done!

After these changes:
- ✅ n8n can insert transactions
- ✅ RLS still protects user data
- ✅ Users can only see their own transactions
- ✅ Service role (n8n) can insert for any user

**Test your workflow now!** 🚀

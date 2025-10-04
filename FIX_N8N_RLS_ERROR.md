# ⚡ QUICK FIX - n8n RLS Error

## ❌ Error You're Getting

```
new row violates row-level security policy for table "transactions"
```

---

## ✅ 2-Step Fix (5 minutes)

### Step 1: Run This SQL (Supabase)

Copy and paste `TRANSACTIONS_RLS_FIX.sql` into **Supabase SQL Editor** and run it.

**Or run this directly:**

```sql
-- Allow service role to insert transactions
CREATE POLICY "Service role full access"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');
```

---

### Step 2: Update n8n Credential

**Problem:** n8n is using **anon key** (can't bypass RLS)

**Solution:** Use **service_role key** (can bypass RLS)

#### How to Fix:

1. **Get Service Role Key:**
   - Supabase Dashboard → Settings → API
   - Find **service_role** key
   - Click 👁️ and copy

2. **Update n8n:**
   - n8n → Credentials → Your Supabase credential
   - Replace API Key with service_role key
   - Save

3. **Test Again** → Should work! ✅

---

## 🎯 Visual Guide

### Current (Wrong):
```
n8n Credential:
API Key: eyJ... ← ANON KEY (can't bypass RLS) ❌
```

### Fixed (Correct):
```
n8n Credential:
API Key: eyJ... ← SERVICE ROLE KEY (bypasses RLS) ✅
```

---

## 🧪 Test It

After fixing, run your n8n workflow again:

**Expected:**
```
✅ Row created in transactions table
{
  "id": "123abc...",
  "user_id": "b970bef4...",
  "type": "send_phone",
  "amount": 5000
}
```

---

## 📚 More Info

- **Detailed guide:** See `N8N_SUPABASE_CONFIG.md`
- **SQL file:** See `TRANSACTIONS_RLS_FIX.sql`

---

**Do these 2 steps and it will work!** 🚀

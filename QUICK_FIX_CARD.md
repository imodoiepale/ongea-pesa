# ⚡ Quick Fix Card - Copy/Paste Solution

## 🎯 The Problem

1. ❌ Balance not reducing when sending money
2. ❌ Error: `transactions_amount_check` constraint violated

---

## ✅ The Solution (2 Minutes)

### 1️⃣ Deploy Webhook Fix

```bash
git add .
git commit -m "Add amount validation"
git push origin main
```
**Wait 1 minute for Vercel deploy** ⏱️

---

### 2️⃣ Fix n8n Supabase Insert Node

**Open your n8n workflow → Supabase Insert node**

**Change these EXACT fields:**

```json
{
  "user_id": "{{ $json.user_id }}",
  "type": "{{ $json.type }}",
  "amount": {{ $json.amount }},
  "phone": "{{ $json.phone }}",
  "status": "completed",
  "voice_command_text": "{{ $json.voice_command_text }}",
  "completed_at": "{{ $now }}",
  "voice_verified": true
}
```

**KEY POINTS:**
- Line 4: `"amount": {{ $json.amount }},` ← **NO QUOTES around {{ }}**
- Line 6: `"status": "completed",` ← **WITH QUOTES, always "completed"**
- Line 7: `"completed_at": "{{ $now }}",` ← **Required for trigger**

**Save workflow** ✅

---

### 3️⃣ Verify n8n Credentials

**In n8n → Credentials → Supabase:**

Must use: **`service_role`** key (NOT anon!)

**Get it from:**
Supabase Dashboard → Settings → API → service_role (secret) → Copy

---

### 4️⃣ Test in SQL (Optional but Recommended)

```sql
-- Add test balance
INSERT INTO transactions (
  user_id, type, amount, status, completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'deposit', 500.00, 'completed', NOW()
);

-- Check it worked
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

---

### 5️⃣ Test Voice Command

Say: **"Send 100 shillings to 0743854888"**

**Expected:**
- ✅ No errors in Vercel logs
- ✅ Transaction created in Supabase
- ✅ Balance decreased by 100
- ✅ UI updates instantly

---

## 🔍 Still Not Working?

### Check n8n Execution Logs

Look for:
```
✅ amount: 200 (number)
✅ status: "completed"
```

**NOT:**
```
❌ amount: "200" (string with quotes)
❌ amount: 0
❌ status: "pending"
```

---

### Check Supabase Transaction

```sql
SELECT 
  amount,
  status,
  completed_at,
  created_at
FROM transactions 
ORDER BY created_at DESC LIMIT 1;
```

**Should show:**
- amount: 100.00 (numeric)
- status: completed
- completed_at: (has timestamp)

---

### Check Trigger Fired

```sql
SELECT 
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

**If updated_at didn't change** → Trigger didn't fire

**Fix:** Ensure n8n sets:
- status = "completed" (exact string)
- completed_at = timestamp (not null)

---

## 📋 Checklist

- [ ] Webhook deployed with validation
- [ ] n8n amount field: NO quotes
- [ ] n8n status field: "completed"
- [ ] n8n completed_at field: "{{ $now }}"
- [ ] n8n using service_role key
- [ ] Test SQL works
- [ ] Test voice command works
- [ ] Balance updates in UI

---

## 🎉 Success Looks Like

**Vercel Logs:**
```
✅ Valid amount: 100
n8n Response Status: 200
✅ Transaction processed
```

**Supabase:**
```
amount: 100.00
status: completed
completed_at: 2025-10-05 00:30:00
```

**UI:**
```
Balance: 400.00 (was 500.00, sent 100)
Transaction appears in history ✅
```

**Done in 2 minutes!** ⚡

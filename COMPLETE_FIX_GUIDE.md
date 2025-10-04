# 🔧 Complete Fix Guide - Balance & Constraint Issues

## 🎯 Two Issues Identified

### 1. ❌ **Balance Not Reducing**
**Status:** ✅ Triggers ARE installed (verified in schema)
**Root Cause:** n8n likely NOT setting `status='completed'`

### 2. ❌ **Constraint Violation**
**Error:** `transactions_amount_check` violated
**Root Cause:** Either amount = 0, negative, or wrong format in n8n

---

## ✅ Complete Fix (Step by Step)

### Step 1: Deploy Updated Webhook (Already Fixed)

I've updated the webhook to validate amount before sending to n8n:
- ✅ Ensures amount > 0
- ✅ Ensures amount <= 999,999
- ✅ Throws clear error if invalid
- ✅ Logs the validated amount

**Deploy this:**
```bash
git add .
git commit -m "Add amount validation in webhook"
git push origin main
```

---

### Step 2: Fix n8n Workflow

Your n8n workflow needs these exact settings:

#### **Supabase Insert Node Configuration:**

**Table:** `transactions`

**Key:** Use **SERVICE_ROLE** key (not anon key!)

**Fields (Expression mode):**

```javascript
{
  "user_id": "{{ $json.user_id }}",
  "type": "{{ $json.type }}",
  "amount": {{ $json.amount }},
  "phone": "{{ $json.phone }}",
  "status": "completed",
  "voice_command_text": "{{ $json.voice_command_text }}",
  "completed_at": "{{ $now }}",
  "voice_verified": true,
  "confidence_score": 85
}
```

**Critical Points:**
- ⚠️ **`amount`**: `{{ $json.amount }}` — **NO QUOTES!**
- ⚠️ **`status`**: `"completed"` — **WITH QUOTES!** (must be this for trigger to fire)
- ⚠️ **`completed_at`**: `"{{ $now }}"` — Required for trigger

---

### Step 3: Test in Supabase SQL

Before testing voice, verify triggers work:

```sql
-- 1. Add test balance
INSERT INTO transactions (
  user_id,
  type,
  amount,
  status,
  voice_command_text,
  completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'deposit',
  1000.00,
  'completed',
  'Test deposit',
  NOW()
);

-- 2. Check balance increased
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
-- Should show: 1000.00 ✅

-- 3. Test send
INSERT INTO transactions (
  user_id,
  type,
  amount,
  phone,
  status,
  voice_command_text,
  completed_at
) VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',
  'send_phone',
  200.00,
  '254743854888',
  'completed',
  'Test send 200',
  NOW()
);

-- 4. Check balance decreased
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
-- Should show: 800.00 ✅

-- 5. View all transactions
SELECT 
  type,
  amount,
  status,
  created_at
FROM transactions
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'
ORDER BY created_at DESC;
```

---

### Step 4: Test Voice Transaction

1. **Say:** "Send 100 shillings to 0743854888"

2. **Check Vercel Logs:**
```
✅ Valid amount: 100
n8n Response Status: 200
✅ Transaction processed
```

3. **Check Supabase:**
```sql
SELECT * FROM transactions 
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'
ORDER BY created_at DESC LIMIT 1;
```

Should show:
- amount: 100.00 ✅
- status: completed ✅
- completed_at: (timestamp) ✅

4. **Check Balance:**
```sql
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

Should be: 700.00 (was 800, sent 100) ✅

5. **Check App UI:**
- Balance should update automatically ⚡
- Transaction should appear in history ✅

---

## 🔍 Debug Checklist

### If balance still not reducing:

**Check 1: Is status = 'completed'?**
```sql
SELECT status, completed_at 
FROM transactions 
ORDER BY created_at DESC LIMIT 1;
```
- ❌ If status = 'pending' → n8n not setting it correctly
- ❌ If completed_at is NULL → n8n not setting it
- ✅ Should be: status='completed' AND completed_at has timestamp

**Fix:** Update n8n Supabase node:
- status: `"completed"` (with quotes)
- completed_at: `"{{ $now }}"` (with quotes)

---

**Check 2: Did trigger fire?**
```sql
-- Check if wallet_balance changed
SELECT 
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```
- ❌ If updated_at didn't change → Trigger didn't fire
- ❌ If wallet_balance didn't change → Trigger didn't fire

**Fix:** Verify trigger exists:
```sql
SELECT * FROM pg_proc WHERE proname = 'update_wallet_balance';
```
If not found → Run `AUTO_BALANCE_UPDATE_TRIGGER.sql`

---

**Check 3: Is n8n using service_role key?**

In n8n Supabase credentials:
- ❌ If using `anon` key → Won't have permission
- ✅ Must use `service_role` key

**Where to find:**
- Supabase Dashboard → Settings → API
- Copy the `service_role` key (secret)
- Paste in n8n credentials

---

### If still getting constraint error:

**Check what n8n is actually inserting:**

In n8n, add a **Code** node before Supabase Insert:
```javascript
console.log('Amount being sent:', $input.item.json.amount);
console.log('Type:', typeof $input.item.json.amount);
console.log('Full data:', JSON.stringify($input.item.json, null, 2));

return $input.all();
```

**Look for:**
- ✅ Amount: 200 (number)
- ❌ Amount: "200" (string) — might work but risky
- ❌ Amount: 0 — **VIOLATES CONSTRAINT**
- ❌ Amount: null — **VIOLATES CONSTRAINT**
- ❌ Amount: -200 — **VIOLATES CONSTRAINT**

---

## 📊 Expected Flow (When Working)

```
User says: "Send 200 to 0743854888"
    ↓
ElevenLabs parses command
    ↓
ElevenLabs calls webhook with:
{
  "type": "send_phone",
  "amount": "200",
  "phone": "254743854888"
}
    ↓
Next.js webhook validates:
✅ amount = 200 (valid, > 0, < 999999)
    ↓
Next.js forwards to n8n:
{
  "amount": 200,
  "type": "send_phone",
  "user_id": "b970...",
  ...
}
    ↓
n8n inserts transaction:
{
  "amount": 200,
  "status": "completed",
  "completed_at": "2025-10-05T00:30:00Z"
}
    ↓
Database trigger fires:
- Detects: type='send_phone' + status='completed'
- Action: wallet_balance -= 200
    ↓
Supabase real-time event published
    ↓
UI updates automatically ⚡
    ↓
User sees new balance: 800.00
```

---

## ✅ Summary

**Files Updated:**
- ✅ `app/api/voice/webhook/route.ts` — Amount validation

**What You Need to Do:**

1. **Deploy webhook fix:**
   ```bash
   git push origin main
   ```

2. **Fix n8n Supabase Insert node:**
   - amount: `{{ $json.amount }}` (NO quotes)
   - status: `"completed"` (WITH quotes)
   - completed_at: `"{{ $now }}"` (WITH quotes)
   - Use **service_role** key

3. **Test in SQL first** (use queries above)

4. **Test with voice command**

5. **Verify balance updates in real-time**

**Total time: 10 minutes!** ⚡

---

## 🎉 When Everything Works

You'll have:
- ✅ Voice commands create transactions
- ✅ Transactions validate before sending to n8n
- ✅ n8n creates with status='completed'
- ✅ Trigger fires automatically
- ✅ Balance updates instantly
- ✅ UI shows new balance in real-time
- ✅ Zero manual intervention
- ✅ Perfect UX ⚡

**The critical fix is in n8n: amount WITHOUT quotes, status WITH quotes!**

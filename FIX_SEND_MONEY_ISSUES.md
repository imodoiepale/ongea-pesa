# 🔧 Fix Send Money Issues

## 🐛 Two Problems Found

### 1. ❌ Balance Not Reducing
**Issue:** When sending money, wallet_balance stays the same

### 2. ❌ Constraint Violation Error
```
Bad request - please check your parameters: 
new row for relation "transactions" violates check constraint "transactions_amount_check"
```

---

## ✅ Complete Fix (5 Minutes)

### Step 1: Fix Database Constraints
**In Supabase SQL Editor:**

```sql
-- Paste and run: FIX_TRANSACTIONS_CONSTRAINT.sql
```

**This fixes:**
- ✅ Amount constraint (allows proper decimals)
- ✅ Ensures amount is NUMERIC type
- ✅ Validates amount > 0

---

### Step 2: Verify Trigger Installed
**In Supabase SQL Editor:**

```sql
-- Check if trigger exists
SELECT * FROM pg_proc WHERE proname = 'update_wallet_balance';
```

**If NO results:**
```sql
-- Run this file:
-- AUTO_BALANCE_UPDATE_TRIGGER.sql
```

**What trigger does:**
- ✅ Automatically updates wallet_balance when transaction created
- ✅ Adds for deposits, subtracts for sends
- ✅ Only processes status='completed' transactions

---

### Step 3: Fix n8n Amount Format

**In your n8n workflow, Supabase "Insert" node:**

**WRONG:**
```json
{
  "amount": "{{ $json.amount }}"  ❌ String with quotes
}
```

**RIGHT:**
```json
{
  "amount": {{ $json.amount }}  ✅ Number without quotes!
}
```

**Also ensure:**
```json
{
  "user_id": "{{ $json.user_id }}",
  "type": "{{ $json.type }}",
  "amount": {{ $json.amount }},
  "phone": "{{ $json.phone }}",
  "status": "completed",
  "voice_command_text": "{{ $json.voice_command_text }}",
  "completed_at": "{{ $now }}"
}
```

---

## 🧪 Test It Works

### Step 1: Add Test Balance

**In Supabase SQL Editor:**
```sql
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
  'Test deposit for send testing',
  NOW()
);

-- Check balance increased
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

**Should show: 1000.00** ✅

---

### Step 2: Test Send Transaction

**In Supabase SQL Editor:**
```sql
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

-- Check balance decreased
SELECT wallet_balance FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

**Should show: 800.00** ✅

---

### Step 3: Test via Voice

1. Say: **"Send 100 shillings to 0743854888"**
2. Check balance in app
3. ✅ Should decrease by 100 instantly

---

## 🔍 Debug If Still Not Working

### Check Transaction Was Created:
```sql
SELECT 
  type,
  amount,
  status,
  completed_at,
  created_at
FROM transactions
WHERE user_id = 'b970bef4-4852-4bce-b424-90a64e2d922f'
ORDER BY created_at DESC
LIMIT 5;
```

**Look for:**
- ✅ amount: 200.00 (not "200" string)
- ✅ status: "completed" (not "pending")
- ✅ completed_at: Has timestamp

---

### Check Trigger Fired:
```sql
-- Check if balance changed
SELECT 
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

**If balance didn't change:**
- Trigger not installed → Run `AUTO_BALANCE_UPDATE_TRIGGER.sql`
- Status not "completed" → Fix n8n to set status='completed'

---

### Check n8n Logs:
Look for:
```
✅ Transaction created
✅ Amount: 200 (number, not string)
✅ Status: completed
```

**If seeing errors:**
- "constraint violation" → Amount is string or negative
- "column does not exist" → Wrong field names
- "permission denied" → Using anon key instead of service_role key

---

## 📋 n8n Checklist

### Webhook Node:
- ✅ Receives data from Next.js API

### Supabase Insert Node:
- ✅ Using **service_role** key (not anon!)
- ✅ Table: `transactions`
- ✅ **amount**: `{{ $json.amount }}` (NO QUOTES!)
- ✅ **status**: `"completed"` (with quotes - it's a string)
- ✅ **completed_at**: `"{{ $now }}"`

### Respond Node:
- ✅ Returns JSON with success/transaction_id

---

## 🎯 Root Causes

### Issue 1: Balance Not Reducing

**Possible Causes:**
1. ❌ Trigger not installed
2. ❌ Status not "completed"
3. ❌ completed_at is NULL

**Fix:** Run trigger SQL + ensure n8n sets proper status

---

### Issue 2: Constraint Violation

**Possible Causes:**
1. ❌ Amount sent as string: `"200"` instead of `200`
2. ❌ Amount is negative: `-200`
3. ❌ Amount has wrong format: `"200.00"`

**Fix:** Remove quotes in n8n amount field

---

## ✅ After Fixing

**Expected behavior:**
1. User says "Send 200"
2. ElevenLabs → Next.js API → n8n
3. n8n creates transaction (status='completed')
4. Trigger fires automatically
5. wallet_balance -= 200
6. Real-time subscription updates UI
7. Balance shows new amount instantly ⚡
8. Voice agent confirms

**No errors, instant updates, perfect UX!** 🎉

---

## 🚀 Quick Action Items

1. [ ] Run `FIX_TRANSACTIONS_CONSTRAINT.sql` in Supabase
2. [ ] Run `AUTO_BALANCE_UPDATE_TRIGGER.sql` in Supabase (if not done)
3. [ ] Fix n8n: Remove quotes from amount field
4. [ ] Ensure n8n sets status='completed'
5. [ ] Test with manual SQL first
6. [ ] Test with voice command
7. [ ] Verify balance reduces instantly

**Total time: 5 minutes!** ⚡

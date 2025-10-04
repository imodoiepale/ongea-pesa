# 🔧 n8n Transaction Creation - Proper Format

## 🐛 Issues to Fix

### 1. **Amount Constraint Violation**
```
Error: "transactions_amount_check" violated
```

**Cause:** Amount being sent as string or negative value

### 2. **Balance Not Reducing**
**Cause:** Transaction not triggering balance update

---

## ✅ Solution: Proper n8n Configuration

### In your n8n "Create Transaction" node:

**Use these EXACT field mappings:**

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

### ⚠️ CRITICAL: Amount Format

**Wrong:**
```json
"amount": "{{ $json.amount }}"  ❌ (string)
```

**Right:**
```json
"amount": {{ $json.amount }}  ✅ (number - no quotes!)
```

---

## 🎯 Complete n8n Workflow

### Node 1: Webhook Trigger
- URL: `/webhook/send_money`
- Method: POST
- Receives data from Next.js API

### Node 2: Validate Amount
Add **Function** node:
```javascript
// Ensure amount is positive number
const amount = parseFloat($input.item.json.amount);
if (isNaN(amount) || amount <= 0) {
  throw new Error('Invalid amount');
}

return {
  ...item,
  json: {
    ...$input.item.json,
    amount: amount
  }
};
```

### Node 3: Process M-Pesa (your existing logic)
- Call M-Pesa API
- Get transaction_id

### Node 4: Create Transaction in Supabase

**Supabase Node Configuration:**

**Operation:** Insert
**Table:** transactions

**Fields (Map from expression):**
```
user_id: {{ $json.user_id }}
type: {{ $json.type }}
amount: {{ $json.amount }}
phone: {{ $json.phone }}
status: completed
voice_command_text: {{ $json.voice_command_text }}
completed_at: {{ $now }}
mpesa_transaction_id: {{ $('M-Pesa API').item.json.transaction_id }}
```

### Node 5: Respond to Webhook

```json
{
  "success": true,
  "transaction_id": "{{ $('Supabase').item.json.id }}",
  "amount": {{ $json.amount }},
  "status": "completed",
  "message": "Transaction processed successfully"
}
```

---

## 🔄 How Balance Updates Automatically

### The Flow:
```
1. n8n creates transaction with status='completed'
   ↓
2. Database trigger fires (AUTO_BALANCE_UPDATE_TRIGGER)
   ↓
3. Trigger checks transaction type:
   - send_phone → Subtract from balance
   - deposit → Add to balance
   ↓
4. wallet_balance updated automatically
   ↓
5. Real-time subscription notifies UI
   ↓
6. Balance updates instantly in app ✨
```

---

## 🧪 Test in n8n

### Test Data:
```json
{
  "user_id": "b970bef4-4852-4bce-b424-90a64e2d922f",
  "type": "send_phone",
  "amount": 200,
  "phone": "254743854888",
  "voice_command_text": "Send 200 to 0743854888"
}
```

### Expected Result:
1. ✅ Transaction created (no constraint error)
2. ✅ wallet_balance decreased by 200
3. ✅ UI shows updated balance

---

## 📋 Checklist

### In Supabase:
- [ ] Run `FIX_TRANSACTIONS_CONSTRAINT.sql`
- [ ] Run `AUTO_BALANCE_UPDATE_TRIGGER.sql` (if not done)
- [ ] Verify trigger exists:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'update_wallet_balance';
  ```

### In n8n:
- [ ] Amount field: NO QUOTES (use {{ }} not "{{ }}")
- [ ] Status: Always "completed" for trigger to fire
- [ ] completed_at: Set to current timestamp
- [ ] Test with manual execution

---

## 🐛 Common Mistakes

### ❌ Wrong: Amount as String
```json
{
  "amount": "200"  // String
}
```
**Error:** Type mismatch or constraint violation

### ❌ Wrong: Status not "completed"
```json
{
  "status": "pending"  // Won't trigger balance update
}
```
**Result:** Balance won't update

### ❌ Wrong: Negative Amount
```json
{
  "amount": -200
}
```
**Error:** Constraint violation

### ✅ Right: Proper Format
```json
{
  "amount": 200,
  "status": "completed",
  "completed_at": "2025-10-05T00:00:00Z"
}
```

---

## 🚀 Quick Fix Steps

### 1. Run SQL in Supabase:
```sql
-- Paste: FIX_TRANSACTIONS_CONSTRAINT.sql
```

### 2. Update n8n Supabase Node:
**Amount field:** Remove quotes around `{{ $json.amount }}`

### 3. Test Transaction:
1. Send money via voice
2. Check Supabase transactions table
3. Verify balance decreased
4. Check UI updates

---

## ✅ Expected Logs

### In n8n Execution:
```
✅ Transaction created
✅ ID: xyz123
✅ Amount: 200 (number)
✅ Status: completed
```

### In Supabase:
```sql
SELECT * FROM transactions 
WHERE user_id = 'YOUR-ID' 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- amount: 200.00 (numeric)
-- status: completed
```

### In profiles:
```sql
SELECT wallet_balance FROM profiles 
WHERE id = 'YOUR-ID';

-- Should show reduced balance
```

---

## 🎉 When It's Fixed

You'll see:
- ✅ No constraint errors
- ✅ Transactions created successfully
- ✅ Balance reduces immediately
- ✅ UI updates in real-time
- ✅ Voice agent confirms transaction

**Fix n8n amount format and run the SQL!** 🚀

# n8n Configuration for Your Existing Database

## 🔑 Key Differences in Your Schema

Your database uses:
- ✅ `wallet_balance` (not `balance`)
- ✅ `update_user_balance(user_id, transaction_id, change_amount, reason)` function
- ✅ `balance_history` table for audit trail
- ✅ Comprehensive transaction types and status tracking

---

## 📋 n8n "Update User Balance" Node Configuration

### Node Setup

Add **HTTP Request** node after "Create a row":

**Name:** Update User Balance

**Method:** POST

**URL:** 
```
https://YOUR_PROJECT.supabase.co/rest/v1/rpc/update_user_balance
```

**Authentication:** None (use headers)

**Headers:**
```
Authorization: Bearer YOUR_SUPABASE_SERVICE_KEY
apikey: YOUR_SUPABASE_SERVICE_KEY
Content-Type: application/json
Prefer: return=minimal
```

**Body (JSON):**
```json
{
  "p_user_id": "={{ $('Create a row').item.json.user_id }}",
  "p_transaction_id": "={{ $('Create a row').item.json.id }}",
  "p_change_amount": "={{ -Math.abs($('Create a row').item.json.amount) }}",
  "p_reason": "={{ 'Voice transaction: ' + $('Create a row').item.json.type + ' - ' + $('Create a row').item.json.voice_command_text }}"
}
```

### Important Notes:

1. **Negative amount for outgoing**: Use `-Math.abs(amount)` to deduct from wallet
2. **Transaction ID**: From the "Create a row" output (after saving to transactions table)
3. **Reason**: Descriptive text for balance_history audit trail

---

## 🔄 Transaction Types and Balance Changes

Your `update_user_balance` function handles validation. Amount should be:

| Transaction Type | Balance Change | Example |
|-----------------|----------------|---------|
| `send_phone` | `-amount` | -1000 (deduct 1000) |
| `buy_goods_pochi` | `-amount` | -500 (deduct 500) |
| `buy_goods_till` | `-amount` | -750 (deduct 750) |
| `paybill` | `-amount` | -2450 (deduct 2450) |
| `withdraw` | `-amount` | -5000 (deduct 5000) |
| `mpesa_to_bank` | `-amount` | -10000 (deduct 10000) |
| `bank_to_mpesa` | `+amount` | +5000 (add 5000) |

---

## 🔧 Updated n8n Workflow

Your complete workflow should be:

```
1. Webhook Trigger
   ↓
2. AI Agent (extracts transaction data)
   ↓  
3. Edit Fields (formats data)
   ↓
4. Create a row (saves to transactions table) ← Returns transaction.id
   ↓
5. HTTP Request: Update User Balance ← Uses transaction.id from step 4
   ↓
6. Respond to Webhook (sends success)
```

---

## 📊 Example: Full n8n Edit Fields Configuration

Your "Edit Fields" node should output:

```javascript
{
  // Required fields matching your transactions table
  user_id: {{ $json.body.user_id || '15f7bee0-76b8-478c-87ff-dc9212b1464e' }},
  type: {{ $json.output.type || $json.body.type }},
  amount: {{ $json.output.amount || $json.body.amount }},
  
  // Optional recipient fields (empty strings when not used)
  phone: {{ $json.output.phone || $json.body.phone || '' }},
  till: {{ $json.output.till || $json.body.till || '' }},
  paybill: {{ $json.output.paybill || $json.body.paybill || '' }},
  account: {{ $json.output.account || $json.body.account || '' }},
  agent: {{ $json.output.agent || $json.body.agent || '' }},
  store: {{ $json.output.store || $json.body.store || '' }},
  bank_code: {{ $json.output.bank_code || $json.body.bank_code || '' }},
  
  // Status and verification
  status: 'pending',
  voice_verified: true,
  confidence_score: {{ $json.body.confidence_score || 85 }},
  voice_command_text: {{ $json.body.voice_command_text || $json.query.request }},
  
  // External references (empty by default)
  mpesa_transaction_id: '',
  external_ref: '',
  
  // Error handling
  error_message: null,
  retry_count: 0
}
```

---

## ✅ Testing Your Setup

### Step 1: Check Current Balance

```sql
SELECT 
  id,
  phone_number,
  wallet_balance,
  created_at,
  updated_at
FROM profiles
WHERE phone_number = 'YOUR_PHONE';
```

### Step 2: Test Voice Command

Speak: **"Send 100 to 0712345678"**

### Step 3: Verify Transaction Created

```sql
SELECT 
  id,
  user_id,
  type,
  amount,
  phone,
  status,
  voice_command_text,
  created_at
FROM transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

### Step 4: Verify Balance Updated

```sql
SELECT 
  phone_number,
  wallet_balance,
  updated_at
FROM profiles
WHERE id = 'YOUR_USER_ID';
```

Expected: `wallet_balance` decreased by transaction amount

### Step 5: Check Balance History

```sql
SELECT 
  user_id,
  transaction_id,
  previous_balance,
  new_balance,
  change_amount,
  reason,
  created_at
FROM balance_history
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

Should show:
- Previous balance: 10000.00
- New balance: 9900.00
- Change amount: -100.00
- Reason: "Voice transaction: send_phone - Send 100 to 0712345678"

---

## 🔍 Complete Test Query

Run this to see the full picture:

```sql
SELECT 
  t.id as transaction_id,
  t.type,
  t.amount,
  t.phone,
  t.status,
  t.voice_command_text,
  t.created_at as transaction_time,
  p.wallet_balance as current_balance,
  bh.previous_balance,
  bh.new_balance,
  bh.change_amount,
  bh.reason as balance_change_reason
FROM transactions t
JOIN profiles p ON t.user_id = p.id
LEFT JOIN balance_history bh ON t.id = bh.transaction_id
WHERE t.user_id = 'YOUR_USER_ID'
ORDER BY t.created_at DESC
LIMIT 10;
```

---

## 🎯 UI Balance Display

Your dashboard now shows the **real wallet balance**:

- ✅ Fetches from `profiles.wallet_balance`
- ✅ Updates every 30 seconds automatically
- ✅ Shows loading spinner while fetching
- ✅ Formats as KSh with 2 decimal places
- ✅ Displays user email below balance

**Balance Card Features:**
- Real-time balance from `/api/balance` endpoint
- Auto-refresh every 30 seconds
- Proper Kenyan Shilling formatting
- Loading state indicator

---

## 🚨 Important: Insufficient Balance Handling

Your `update_user_balance` function already handles this:

```sql
-- Validate sufficient funds
IF v_new_balance < 0 THEN
  RAISE EXCEPTION 'Insufficient balance';
END IF;
```

### What Happens:

1. User says: "Send 15000 to 0712345678"
2. Current balance: KSh 10,000
3. n8n tries to update balance: 10000 - 15000 = -5000
4. **PostgreSQL raises exception**: "Insufficient balance"
5. n8n workflow fails at "Update Balance" node
6. Transaction status remains: `pending`
7. Agent should respond: "Transaction failed: Insufficient funds"

### Handling in n8n:

Add an **Error Trigger** node:
1. Connect to "Update User Balance" node
2. On error, update transaction status to `failed`
3. Set error_message to the exception message
4. Return error response to ElevenLabs

---

## 📝 Summary

Your existing schema is **production-ready** with:

- ✅ `wallet_balance` tracking
- ✅ `balance_history` audit trail
- ✅ Transaction validation
- ✅ Insufficient funds protection
- ✅ Row-level security policies
- ✅ Real-time subscriptions
- ✅ Comprehensive transaction types

**All you need to do:**
1. ✅ Add "Update User Balance" HTTP Request node in n8n
2. ✅ Use your existing `update_user_balance` function
3. ✅ UI already updated to show `wallet_balance`

**Test and you're live!** 🚀

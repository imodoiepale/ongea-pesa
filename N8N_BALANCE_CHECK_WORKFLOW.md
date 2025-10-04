# n8n Workflow: Add Balance Check Before Transactions

## Problem
Your workflow is creating transactions without checking if the user has sufficient balance. This causes:
- Constraint violations when balance would go negative
- Failed transactions
- Poor user experience

## Example from Your Logs
```
User balance: KSh 14,630
Transaction amount: KSh 116,000
Result: ❌ Insufficient funds
```

## Solution: Add Balance Check

### Complete n8n Workflow

```
[Webhook: Receive Transaction]
  ↓
[Function: Parse & Validate]
  ↓
[Supabase: Get User Profile]
  ↓
[IF: Is Debit Transaction?]
  YES ↓                    NO ↓
  [IF: Sufficient Balance?]  [Create Transaction]
    YES ↓         NO ↓
    [Create]      [Respond: Insufficient Funds]
```

### Node 1: Function - Parse & Validate

```javascript
// Parse and validate incoming data
const validTypes = [
  'send_phone', 'buy_goods_pochi', 'buy_goods_till', 
  'paybill', 'withdraw', 'bank_to_mpesa', 'mpesa_to_bank',
  'deposit', 'receive'
];

const creditTypes = ['deposit', 'receive'];

// Get and validate type
const type = ($json.type || '').toLowerCase().trim();
if (!validTypes.includes(type)) {
  throw new Error(`Invalid transaction type: ${type}`);
}

// Validate amount
const amount = parseFloat($json.amount);
if (isNaN(amount) || amount <= 0) {
  throw new Error('Amount must be greater than 0');
}
if (amount > 999999) {
  throw new Error('Amount cannot exceed 999,999');
}

// Validate user_id
if (!$json.user_id) {
  throw new Error('user_id is required');
}

// Determine if this is a debit (money going out)
const isDebit = !creditTypes.includes(type);

return {
  user_id: $json.user_id,
  type: type,
  amount: amount,
  isDebit: isDebit,
  phone: $json.phone || '',
  till: $json.till || '',
  paybill: $json.paybill || '',
  account: $json.account || '',
  agent: $json.agent || '',
  store: $json.store || '',
  bank_code: $json.bank_code || '',
  voice_command_text: $json.voice_command_text || $json.request || 'Transaction',
  voice_verified: $json.voice_verified || false,
  confidence_score: parseInt($json.confidence_score) || null
};
```

### Node 2: Supabase - Get User Profile

**Operation:** Get  
**Table:** profiles  
**Filter:** `id = {{ $json.user_id }}`

**Return Fields:**
- id
- wallet_balance
- phone_number

### Node 3: IF - Is Debit Transaction?

**Condition:**
```javascript
{{ $('Function').item.json.isDebit }}
```

### Node 4: IF - Sufficient Balance? (Only if YES from Node 3)

**Condition:**
```javascript
// Check if balance >= amount
const balance = parseFloat($json.wallet_balance) || 0;
const amount = parseFloat($('Function').item.json.amount);

return balance >= amount;
```

### Node 5a: Create Transaction (If Sufficient Balance)

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $('Function').item.json.user_id }}",
  "type": "={{ $('Function').item.json.type }}",
  "amount": "={{ $('Function').item.json.amount }}",
  "phone": "={{ $('Function').item.json.phone }}",
  "till": "={{ $('Function').item.json.till }}",
  "paybill": "={{ $('Function').item.json.paybill }}",
  "account": "={{ $('Function').item.json.account }}",
  "agent": "={{ $('Function').item.json.agent }}",
  "store": "={{ $('Function').item.json.store }}",
  "bank_code": "={{ $('Function').item.json.bank_code }}",
  "status": "completed",
  "voice_verified": "={{ $('Function').item.json.voice_verified }}",
  "confidence_score": "={{ $('Function').item.json.confidence_score }}",
  "voice_command_text": "={{ $('Function').item.json.voice_command_text }}",
  "created_at": "={{ $now.toISO() }}",
  "completed_at": "={{ $now.toISO() }}"
}
```

### Node 5b: Respond - Insufficient Funds (If Balance Too Low)

**Respond to Webhook Node:**
```json
{
  "success": false,
  "error": "Insufficient funds",
  "message": "Your balance (KSh {{ $('Supabase').item.json.wallet_balance }}) is less than the transaction amount (KSh {{ $('Function').item.json.amount }})",
  "current_balance": "={{ $('Supabase').item.json.wallet_balance }}",
  "required_amount": "={{ $('Function').item.json.amount }}",
  "shortfall": "={{ $('Function').item.json.amount - $('Supabase').item.json.wallet_balance }}"
}
```

### Node 6: Success Response

**Respond to Webhook Node:**
```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "id": "={{ $json.id }}",
    "type": "={{ $json.type }}",
    "amount": "={{ $json.amount }}",
    "status": "={{ $json.status }}"
  },
  "new_balance": "Will be calculated by trigger"
}
```

## Simplified Version (For Your Current Case)

If you want a quick fix for your current workflow:

### Add This Function Node BEFORE Creating Transaction

```javascript
// Get user's current balance
const balance = parseFloat($json.wallet_balance) || 0;
const amount = parseFloat($json.amount);
const type = $json.type;

// Types that deduct from balance
const debitTypes = [
  'send_phone', 'buy_goods_pochi', 'buy_goods_till',
  'paybill', 'withdraw', 'bank_to_mpesa', 'mpesa_to_bank'
];

// Check if this is a debit transaction
const isDebit = debitTypes.includes(type);

// If debit, check balance
if (isDebit && balance < amount) {
  throw new Error(
    `Insufficient funds. Balance: KSh ${balance}, Required: KSh ${amount}`
  );
}

// If we get here, balance is sufficient
return $json;
```

## For Your Specific Case

Based on your logs:

```javascript
// Current situation:
User balance: 14,630
Transaction: paybill 116,000
Result: BLOCKED ✅ (This is correct!)

// What should happen:
1. Check balance (14,630)
2. Compare with amount (116,000)
3. Return error: "Insufficient funds. You need KSh 101,370 more"
4. Don't create transaction
```

## Complete Workflow with Balance Check

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Webhook: Receive Transaction Request                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Function: Validate Input                                 │
│    - Check type is valid                                    │
│    - Check amount is number                                 │
│    - Determine if debit/credit                              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Supabase: Get User Profile                               │
│    - Fetch wallet_balance                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IF: Is this a debit transaction?                         │
└─────┬──────────────────────────────────────────┬────────────┘
      │ YES (send, paybill, etc.)                │ NO (deposit, receive)
      ↓                                          ↓
┌─────────────────────────────┐    ┌────────────────────────────┐
│ 5. IF: Balance >= Amount?   │    │ 7. Create Transaction      │
└─────┬───────────────┬───────┘    │    (No balance check)      │
      │ YES           │ NO          └────────────┬───────────────┘
      ↓               ↓                          ↓
┌─────────────┐ ┌────────────────┐         ┌────────────────────┐
│ 6. Create   │ │ 8. Respond:    │         │ 9. Success         │
│ Transaction │ │ Insufficient   │         │ Response           │
└──────┬──────┘ │ Funds          │         └────────────────────┘
       │        └────────────────┘
       ↓
┌─────────────────────────────┐
│ 9. Success Response         │
└─────────────────────────────┘
```

## Testing Your Fixed Workflow

### Test 1: Sufficient Balance (Should Pass)
```json
{
  "user_id": "b970bef4-4852-4bce-b424-90a64e2d922f",
  "type": "paybill",
  "amount": 1000,
  "paybill": "335577",
  "account": "292927"
}
```
**Expected:** ✅ Transaction created, balance: 14630 - 1000 = 13630

### Test 2: Insufficient Balance (Should Fail Gracefully)
```json
{
  "user_id": "b970bef4-4852-4bce-b424-90a64e2d922f",
  "type": "paybill",
  "amount": 116000,
  "paybill": "335577",
  "account": "292927"
}
```
**Expected:** ❌ Error: "Insufficient funds. Balance: 14630, Required: 116000"

### Test 3: Deposit (No Balance Check Needed)
```json
{
  "user_id": "b970bef4-4852-4bce-b424-90a64e2d922f",
  "type": "deposit",
  "amount": 50000
}
```
**Expected:** ✅ Transaction created, balance: 14630 + 50000 = 64630

## Summary

✅ **Add balance check** before debit transactions  
✅ **Allow deposits/receives** without balance check  
✅ **Return clear error** when insufficient funds  
✅ **Prevent negative balances** at the application level  
✅ **Better user experience** with informative error messages  

This prevents the constraint violation and provides a better user experience!

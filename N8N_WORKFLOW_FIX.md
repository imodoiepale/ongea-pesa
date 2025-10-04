# n8n Workflow Fix for Balance Issue

## The Problem in Your n8n Workflow

The error `new row for relation "profiles" violates check constraint "profiles_wallet_balance_check"` means your n8n workflow is trying to:

1. Create or update a profile with `wallet_balance < 0` or `NULL`
2. Manually set `wallet_balance` instead of letting triggers handle it

## Fix Your n8n Workflow

### ❌ WRONG: Current Workflow (Causing Error)

```json
// Node: "Create a row" in profiles table
{
  "user_id": "{{ $json.user_id }}",
  "phone_number": "{{ $json.phone }}",
  "wallet_balance": "{{ $json.balance }}"  // ❌ DON'T DO THIS
}
```

**Problems:**
- Manually setting `wallet_balance` can violate constraint
- If `$json.balance` is undefined, it becomes NULL → error
- If calculation is wrong, could be negative → error
- Bypasses the automatic trigger system

### ✅ CORRECT: Fixed Workflow

#### Option 1: Only Create Transactions (Recommended)

```json
// Node: "Create a row" in transactions table
{
  "user_id": "{{ $json.user_id }}",
  "type": "deposit",
  "amount": {{ parseFloat($json.amount) }},
  "status": "completed",
  "phone": "{{ $json.phone }}",
  "voice_command_text": "{{ $json.command || 'Manual deposit' }}",
  "created_at": "{{ $now.toISO() }}"
}
```

**Why this works:**
- ✅ Triggers automatically update `wallet_balance`
- ✅ No constraint violations
- ✅ Balance always accurate
- ✅ Works for all transaction types

#### Option 2: Create Profile for New Users Only

```json
// Node: "Create a row" in profiles table (ONLY for new users)
{
  "id": "{{ $json.user_id }}",
  "phone_number": "{{ $json.phone }}",
  "wallet_balance": 0,  // ✅ Always start at 0
  "mpesa_number": "{{ $json.phone }}",
  "created_at": "{{ $now.toISO() }}"
}

// Then immediately create deposit transaction
// Node: "Create a row" in transactions table
{
  "user_id": "{{ $json.user_id }}",
  "type": "deposit",
  "amount": {{ parseFloat($json.amount) }},
  "status": "completed"
}
// Trigger will update balance from 0 to amount
```

## Complete n8n Workflow Examples

### Workflow 1: Manual Deposit

```
[Webhook] 
  → [Function: Validate Amount]
  → [Supabase: Create Transaction]
  → [Supabase: Get Updated Profile]
  → [Respond to Webhook]
```

**Function Node: Validate Amount**
```javascript
// Ensure amount is a valid number
const amount = parseFloat($json.amount);

if (isNaN(amount) || amount <= 0) {
  throw new Error('Invalid amount');
}

if (amount > 999999) {
  throw new Error('Amount exceeds maximum');
}

return {
  user_id: $json.user_id,
  amount: amount,
  phone: $json.phone,
  type: 'deposit'
};
```

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "={{ $json.type }}",
  "amount": "={{ $json.amount }}",
  "status": "completed",
  "phone": "={{ $json.phone }}",
  "created_at": "={{ $now.toISO() }}"
}
```

**Supabase Node: Get Updated Profile**
```
Table: profiles
Operation: Get
Filter: id = {{ $json.user_id }}
```

### Workflow 2: Send Money

```
[Webhook]
  → [Function: Validate]
  → [Supabase: Check Balance]
  → [IF: Balance Sufficient]
      YES → [Supabase: Create Transaction]
      NO → [Respond: Insufficient Funds]
```

**Function Node: Validate**
```javascript
const amount = parseFloat($json.amount);
const phone = $json.phone.replace(/\D/g, ''); // Remove non-digits

if (isNaN(amount) || amount <= 0) {
  throw new Error('Invalid amount');
}

if (!phone || phone.length < 10) {
  throw new Error('Invalid phone number');
}

return {
  user_id: $json.user_id,
  amount: amount,
  phone: phone,
  type: 'send_phone'
};
```

**Supabase Node: Check Balance**
```
Table: profiles
Operation: Get
Filter: id = {{ $json.user_id }}
```

**IF Node: Balance Sufficient**
```javascript
// Check if balance >= amount
const balance = parseFloat($json.wallet_balance);
const amount = parseFloat($('Function').item.json.amount);

return balance >= amount;
```

**Supabase Node: Create Transaction** (if YES)
```json
{
  "user_id": "={{ $('Function').item.json.user_id }}",
  "type": "send_phone",
  "amount": "={{ $('Function').item.json.amount }}",
  "phone": "={{ $('Function').item.json.phone }}",
  "status": "completed",
  "created_at": "={{ $now.toISO() }}"
}
```

### Workflow 3: New User Registration

```
[Webhook: New User]
  → [Supabase: Create Profile]
  → [Supabase: Create Welcome Deposit]
  → [Respond]
```

**Supabase Node: Create Profile**
```json
{
  "id": "={{ $json.user_id }}",
  "phone_number": "={{ $json.phone }}",
  "mpesa_number": "={{ $json.phone }}",
  "wallet_balance": 0,
  "email": "={{ $json.email }}",
  "created_at": "={{ $now.toISO() }}"
}
```

**Supabase Node: Create Welcome Deposit**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "deposit",
  "amount": 100,
  "status": "completed",
  "voice_command_text": "Welcome bonus",
  "created_at": "={{ $now.toISO() }}"
}
```

## Key Rules for n8n

### ✅ DO:
1. **Create transactions** with `status='completed'`
2. **Use numeric amounts** - `{{ parseFloat($json.amount) }}`
3. **Let triggers update balance** automatically
4. **Validate amounts** before creating transactions
5. **Check balance** before debits (send, withdraw, etc.)

### ❌ DON'T:
1. **Don't manually set `wallet_balance`** in profiles
2. **Don't use string amounts** - `"{{ $json.amount }}"` ❌
3. **Don't create transactions with `status='pending'`** if you want immediate balance update
4. **Don't bypass validation** - always check amount is valid number
5. **Don't create negative amounts** - will violate constraint

## Amount Handling in n8n

### ❌ WRONG:
```json
{
  "amount": "{{ $json.amount }}"  // String - will fail
}
```

### ✅ CORRECT:
```json
{
  "amount": "={{ parseFloat($json.amount) }}"  // Number
}
```

Or in Function node:
```javascript
return {
  amount: parseFloat($json.amount)  // Ensures it's a number
};
```

## Transaction Status Flow

### For Immediate Balance Update:
```json
{
  "status": "completed"  // Balance updates immediately
}
```

### For Pending Transactions:
```json
// Step 1: Create as pending
{
  "status": "pending"  // Balance NOT updated yet
}

// Step 2: Later, update to completed
{
  "status": "completed"  // Trigger fires, balance updates
}
```

## Testing Your Fixed Workflow

### Test 1: Create Deposit
**Input:**
```json
{
  "user_id": "your-user-id",
  "amount": 100,
  "phone": "254712345678"
}
```

**Expected:**
- ✅ Transaction created with status='completed'
- ✅ Balance increases by 100
- ✅ No errors

### Test 2: Send Money
**Input:**
```json
{
  "user_id": "your-user-id",
  "amount": 50,
  "phone": "254798765432"
}
```

**Expected:**
- ✅ Balance check passes
- ✅ Transaction created
- ✅ Balance decreases by 50
- ✅ No errors

### Test 3: Insufficient Funds
**Input:**
```json
{
  "user_id": "your-user-id",
  "amount": 999999,
  "phone": "254798765432"
}
```

**Expected:**
- ✅ Balance check fails
- ✅ Error returned: "Insufficient funds"
- ✅ No transaction created
- ✅ Balance unchanged

## Common n8n Errors & Fixes

### Error: "profiles_wallet_balance_check"
**Fix:** Remove any nodes that set `wallet_balance` manually

### Error: "amount must be numeric"
**Fix:** Use `{{ parseFloat($json.amount) }}` instead of `"{{ $json.amount }}"`

### Error: "status must be one of..."
**Fix:** Use lowercase: `"completed"` not `"Completed"`

### Balance not updating
**Fix:** Ensure `status='completed'` in transaction

## Summary

✅ **Remove** any "Create/Update Profile" nodes that set `wallet_balance`  
✅ **Only create transactions** - let triggers handle balance  
✅ **Use numeric amounts** - `parseFloat()`  
✅ **Set status='completed'** for immediate balance update  
✅ **Validate inputs** before creating transactions  

Your n8n workflow will now work perfectly with the automatic balance system!

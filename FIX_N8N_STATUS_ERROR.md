# Fix: n8n Transaction Status Error

## Error Message
```
new row for relation "transactions" violates check constraint "transactions_status_check"
```

## Problem
You're passing an invalid status value. The database only accepts these **exact** values (case-sensitive):
- `pending`
- `processing`
- `completed`
- `failed`
- `cancelled`

## Common Mistakes in n8n

### ❌ WRONG - These Will Fail:

```json
// Capitalization error
{
  "status": "Completed"  // ❌ Must be lowercase
}

// Typo
{
  "status": "complete"   // ❌ Missing 'd'
}

// Wrong value
{
  "status": "success"    // ❌ Not in allowed list
}

// Empty or null
{
  "status": ""           // ❌ Empty string
}
{
  "status": null         // ❌ NULL not allowed
}

// Using variable without validation
{
  "status": "={{ $json.status }}"  // ❌ If $json.status is undefined or wrong
}
```

### ✅ CORRECT - These Will Work:

```json
// Hardcoded (recommended for most cases)
{
  "status": "completed"  // ✅ Lowercase, exact match
}

// Or for pending transactions
{
  "status": "pending"    // ✅ Will be updated later
}

// Using variable with default
{
  "status": "={{ $json.status || 'completed' }}"  // ✅ Fallback to 'completed'
}
```

## Fixed n8n Workflow Examples

### Example 1: Create Completed Transaction (Recommended)

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "deposit",
  "amount": "={{ parseFloat($json.amount) }}",
  "status": "completed",
  "phone": "={{ $json.phone }}",
  "voice_command_text": "={{ $json.command || 'Manual deposit' }}",
  "created_at": "={{ $now.toISO() }}"
}
```

**Key Points:**
- ✅ `status` is hardcoded as `"completed"`
- ✅ Balance updates immediately
- ✅ No constraint violations

### Example 2: Create Pending Transaction (For Processing)

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "send_phone",
  "amount": "={{ parseFloat($json.amount) }}",
  "status": "pending",
  "phone": "={{ $json.phone }}",
  "created_at": "={{ $now.toISO() }}"
}
```

**Later, Update to Completed:**
```json
{
  "status": "completed",
  "completed_at": "={{ $now.toISO() }}"
}
```

### Example 3: With Validation (Function Node)

**Function Node: Prepare Transaction Data**
```javascript
// Validate and prepare transaction data
const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
const status = ($json.status || 'completed').toLowerCase();

// Validate status
if (!validStatuses.includes(status)) {
  throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
}

// Validate amount
const amount = parseFloat($json.amount);
if (isNaN(amount) || amount <= 0 || amount > 999999) {
  throw new Error('Invalid amount. Must be between 0 and 999999');
}

// Return validated data
return {
  user_id: $json.user_id,
  type: $json.type || 'deposit',
  amount: amount,
  status: status,
  phone: $json.phone,
  voice_command_text: $json.command || 'Transaction',
  created_at: new Date().toISOString()
};
```

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "={{ $json.type }}",
  "amount": "={{ $json.amount }}",
  "status": "={{ $json.status }}",
  "phone": "={{ $json.phone }}",
  "voice_command_text": "={{ $json.voice_command_text }}",
  "created_at": "={{ $json.created_at }}"
}
```

## All Valid Status Values

| Status | When to Use | Balance Update |
|--------|-------------|----------------|
| `pending` | Transaction created, awaiting processing | ❌ No |
| `processing` | Transaction being processed | ❌ No |
| `completed` | Transaction successful | ✅ Yes |
| `failed` | Transaction failed | ❌ No |
| `cancelled` | Transaction cancelled | ❌ No |

## Transaction Type Validation

While fixing status, also ensure `type` is valid:

**Valid types:**
- `send_phone`
- `buy_goods_pochi`
- `buy_goods_till`
- `paybill`
- `withdraw`
- `bank_to_mpesa`
- `mpesa_to_bank`
- `deposit`
- `receive`

## Complete Validated n8n Workflow

```
[Webhook]
  ↓
[Function: Validate All Fields]
  ↓
[Supabase: Create Transaction]
  ↓
[Respond to Webhook]
```

**Function Node: Validate All Fields**
```javascript
// Valid values
const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
const validTypes = [
  'send_phone', 'buy_goods_pochi', 'buy_goods_till', 
  'paybill', 'withdraw', 'bank_to_mpesa', 'mpesa_to_bank',
  'deposit', 'receive'
];

// Get and validate status
const status = ($json.status || 'completed').toLowerCase().trim();
if (!validStatuses.includes(status)) {
  throw new Error(`Invalid status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
}

// Get and validate type
const type = ($json.type || 'deposit').toLowerCase().trim();
if (!validTypes.includes(type)) {
  throw new Error(`Invalid type: "${type}". Must be one of: ${validTypes.join(', ')}`);
}

// Validate amount
const amount = parseFloat($json.amount);
if (isNaN(amount)) {
  throw new Error('Amount must be a number');
}
if (amount <= 0) {
  throw new Error('Amount must be greater than 0');
}
if (amount > 999999) {
  throw new Error('Amount cannot exceed 999,999');
}

// Validate user_id
if (!$json.user_id) {
  throw new Error('user_id is required');
}

// Return validated data
return {
  user_id: $json.user_id,
  type: type,
  amount: amount,
  status: status,
  phone: $json.phone || '',
  till: $json.till || '',
  paybill: $json.paybill || '',
  account: $json.account || '',
  voice_command_text: $json.command || `${type} transaction`,
  created_at: new Date().toISOString(),
  ...(status === 'completed' && { completed_at: new Date().toISOString() })
};
```

**Supabase Node: Create Transaction**
```json
{
  "user_id": "={{ $json.user_id }}",
  "type": "={{ $json.type }}",
  "amount": "={{ $json.amount }}",
  "status": "={{ $json.status }}",
  "phone": "={{ $json.phone }}",
  "till": "={{ $json.till }}",
  "paybill": "={{ $json.paybill }}",
  "account": "={{ $json.account }}",
  "voice_command_text": "={{ $json.voice_command_text }}",
  "created_at": "={{ $json.created_at }}"
}
```

## Quick Debug Checklist

When you get the status error, check:

1. ✅ **Is status lowercase?** - Must be `"completed"` not `"Completed"`
2. ✅ **Is status spelled correctly?** - `"completed"` not `"complete"`
3. ✅ **Is status in the allowed list?** - Check against: pending, processing, completed, failed, cancelled
4. ✅ **Is status a string?** - Not a number or boolean
5. ✅ **Is status not empty?** - Not `""` or `null`

## Testing Your Fix

### Test 1: Valid Status
```json
{
  "user_id": "test-user-id",
  "type": "deposit",
  "amount": 100,
  "status": "completed"
}
```
**Expected:** ✅ Transaction created successfully

### Test 2: Invalid Status (Should Fail)
```json
{
  "status": "Completed"  // Capital C
}
```
**Expected:** ❌ Error caught by validation function

### Test 3: Default Status
```json
{
  "user_id": "test-user-id",
  "type": "deposit",
  "amount": 100
  // No status field - defaults to "completed"
}
```
**Expected:** ✅ Transaction created with status="completed"

## Summary

✅ **Use lowercase** - `"completed"` not `"Completed"`  
✅ **Check spelling** - `"completed"` not `"complete"`  
✅ **Use valid values** - pending, processing, completed, failed, cancelled  
✅ **Add validation** - Use Function node to validate before creating  
✅ **Provide defaults** - Use `{{ $json.status || 'completed' }}`  

Your n8n workflow will now pass the status constraint check!

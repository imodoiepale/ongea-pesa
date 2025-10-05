# Real-Time Balance Validation System

## Overview

The system now validates balance **before** transactions reach n8n or the database, providing immediate feedback to the ElevenLabs AI agent.

## How It Works

```
User speaks → ElevenLabs AI → Webhook → Balance Check → n8n/Database
                                            ↓
                                    ❌ Insufficient Funds?
                                            ↓
                                    Return to AI Agent
                                            ↓
                                    AI speaks error message
```

## Implementation

### 1. Voice Webhook (`/api/voice/webhook/route.ts`)

The webhook now performs these checks **in real-time**:

#### Step 1: Fetch Current Balance
```typescript
// Get user's current wallet balance from database
const { data: balanceData } = await supabase
  .from('profiles')
  .select('wallet_balance')
  .eq('id', userId)
  .single()

const currentBalance = parseFloat(balanceData.wallet_balance) || 0
```

#### Step 2: Validate Amount
```typescript
const requestedAmount = parseFloat(body.amount)

// Check if amount is valid
if (isNaN(requestedAmount) || requestedAmount <= 0) {
  return error: "Invalid amount"
}

// Check if amount exceeds maximum
if (requestedAmount > 999999) {
  return error: "Amount too large"
}
```

#### Step 3: Check Balance for Debit Transactions
```typescript
const debitTypes = [
  'send_phone', 'paybill', 'withdraw', 
  'buy_goods_till', 'buy_goods_pochi',
  'bank_to_mpesa', 'mpesa_to_bank'
]

if (debitTypes.includes(transactionType)) {
  if (currentBalance < requestedAmount) {
    const shortfall = requestedAmount - currentBalance
    
    return {
      success: false,
      error: 'Insufficient funds',
      current_balance: currentBalance,
      required_amount: requestedAmount,
      shortfall: shortfall,
      agent_message: "I'm sorry, but you don't have enough funds..."
    }
  }
}
```

#### Step 4: Only Proceed if All Checks Pass
```typescript
// If we reach here, all validations passed
// Forward to n8n for processing
await fetch(N8N_WEBHOOK_URL, {
  method: 'POST',
  body: JSON.stringify(transaction)
})
```

## Error Responses

The webhook returns structured error responses that the AI agent can understand:

### Insufficient Funds Error
```json
{
  "success": false,
  "error": "Insufficient funds",
  "message": "Your current balance is KSh 14,630, but you're trying to send KSh 116,000. You need KSh 101,370 more.",
  "current_balance": 14630,
  "required_amount": 116000,
  "shortfall": 101370,
  "agent_message": "I'm sorry, but you don't have enough funds for this transaction. Your current balance is 14,630 shillings, but you're trying to send 116,000 shillings. You need 101,370 shillings more. Would you like to add funds to your wallet first?"
}
```

### Invalid Amount Error
```json
{
  "success": false,
  "error": "Invalid amount",
  "message": "The amount -500 is not valid. Please provide a positive number.",
  "current_balance": 14630,
  "agent_message": "I'm sorry, but the amount you provided is invalid. Please try again with a valid amount."
}
```

### Amount Too Large Error
```json
{
  "success": false,
  "error": "Amount too large",
  "message": "The amount KSh 1,500,000 exceeds the maximum of KSh 999,999.",
  "current_balance": 14630,
  "agent_message": "I'm sorry, but the amount of 1,500,000 shillings exceeds our maximum transaction limit of 999,999 shillings. Please try a smaller amount."
}
```

## ElevenLabs AI Agent Configuration

Update your ElevenLabs agent to handle error responses:

### Agent System Prompt Addition

```
When you receive an error response from the transaction webhook:
1. Check if response.success is false
2. Read the agent_message field
3. Speak the agent_message to the user naturally
4. Offer alternatives (e.g., "Would you like to add funds first?")

Example error handling:
- Insufficient funds → Suggest adding money to wallet
- Invalid amount → Ask user to provide a valid amount
- Amount too large → Suggest splitting into smaller transactions
```

### Tool Configuration

In your ElevenLabs tool configuration, add error handling:

```json
{
  "name": "send_money",
  "description": "Send money via M-Pesa",
  "url": "https://ongeapesa.vercel.app/api/voice/webhook",
  "method": "POST",
  "error_handling": {
    "on_400": "Read agent_message field and speak it to user",
    "on_500": "Say: I'm sorry, there was a technical issue. Please try again."
  }
}
```

## Transaction Flow Examples

### Example 1: Sufficient Balance ✅

```
User: "Send 1000 shillings to 0712345678"
  ↓
Balance Check:
  Current: 14,630
  Required: 1,000
  Result: ✅ PASS
  ↓
Transaction Created:
  Status: completed
  New Balance: 13,630
  ↓
AI Agent: "I've sent 1,000 shillings to 0712345678. Your new balance is 13,630 shillings."
```

### Example 2: Insufficient Balance ❌

```
User: "Pay bill 335577 account 292927 amount 116000"
  ↓
Balance Check:
  Current: 14,630
  Required: 116,000
  Result: ❌ FAIL (Shortfall: 101,370)
  ↓
Webhook Returns Error (400):
  {
    "success": false,
    "error": "Insufficient funds",
    "agent_message": "I'm sorry, but you don't have enough funds..."
  }
  ↓
AI Agent: "I'm sorry, but you don't have enough funds for this transaction. Your current balance is 14,630 shillings, but you're trying to send 116,000 shillings. You need 101,370 shillings more. Would you like to add funds to your wallet first?"
  ↓
User: "Yes, add 100,000"
  ↓
Deposit Transaction:
  Type: deposit
  Amount: 100,000
  New Balance: 114,630
  ↓
AI Agent: "I've added 100,000 shillings to your wallet. Your new balance is 114,630 shillings. Would you like to try the paybill transaction again?"
```

### Example 3: Invalid Amount ❌

```
User: "Send negative 500 to 0712345678"
  ↓
Amount Validation:
  Parsed: -500
  Result: ❌ FAIL (Must be positive)
  ↓
Webhook Returns Error (400):
  {
    "success": false,
    "error": "Invalid amount",
    "agent_message": "I'm sorry, but the amount you provided is invalid..."
  }
  ↓
AI Agent: "I'm sorry, but the amount you provided is invalid. Please try again with a valid amount."
```

## Benefits

### 1. **Instant Feedback**
- No waiting for database constraints to fail
- User knows immediately if transaction will succeed
- Better user experience

### 2. **Prevents Database Errors**
- Catches issues before they reach the database
- No constraint violations
- Cleaner error logs

### 3. **AI Agent Awareness**
- Agent knows exact balance in real-time
- Can provide accurate information
- Can suggest alternatives

### 4. **Transaction Safety**
- Prevents negative balances
- Validates amounts before processing
- Ensures data integrity

## Testing

### Test 1: Sufficient Balance
```bash
curl -X POST https://ongeapesa.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "1000",
    "phone": "254712345678"
  }'
```

**Expected:** ✅ Transaction created

### Test 2: Insufficient Balance
```bash
curl -X POST https://ongeapesa.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "paybill",
    "amount": "116000",
    "paybill": "335577",
    "account": "292927"
  }'
```

**Expected:** ❌ Error with agent_message

### Test 3: Invalid Amount
```bash
curl -X POST https://ongeapesa.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "-500",
    "phone": "254712345678"
  }'
```

**Expected:** ❌ Error: Invalid amount

## Monitoring

Check your logs for these indicators:

### Successful Transaction
```
💰 Current wallet balance: 14630
💳 Debit transaction detected, checking balance...
  Type: send_phone
  Amount: 1000
  Current Balance: 14630
✅ BALANCE CHECK PASSED
  Balance after transaction will be: 13630
```

### Insufficient Funds
```
💰 Current wallet balance: 14630
💳 Debit transaction detected, checking balance...
  Type: paybill
  Amount: 116000
  Current Balance: 14630
❌ INSUFFICIENT FUNDS
  Balance: 14630
  Required: 116000
  Shortfall: 101370
```

## Summary

✅ **Real-time validation** - Checks balance before processing  
✅ **Immediate feedback** - AI agent knows instantly  
✅ **Prevents errors** - No database constraint violations  
✅ **Better UX** - Clear, actionable error messages  
✅ **Transaction safety** - Ensures sufficient funds  

The system now intercepts insufficient balance transactions **before** they reach n8n or the database, providing immediate, natural feedback to users through the AI agent.

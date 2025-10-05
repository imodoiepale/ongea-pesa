# Balance Check - Quick Reference Guide

## What Changed

✅ **Real-time balance validation** added to `/api/voice/webhook/route.ts`  
✅ **Instant feedback** to ElevenLabs AI agent  
✅ **No database errors** - validation happens before n8n  

## How It Works

```
User Request → Webhook → Check Balance → Decision
                              ↓
                    Sufficient? ✅ → Process Transaction
                    Insufficient? ❌ → Return Error to AI
```

## Validation Rules

### 1. Amount Validation
- ✅ Must be a positive number
- ✅ Must be ≤ 999,999
- ❌ Cannot be 0, negative, or non-numeric

### 2. Balance Check (Debit Transactions Only)
- ✅ Checks: send_phone, paybill, withdraw, buy_goods_till, buy_goods_pochi
- ✅ Skips: deposit, receive (these add money)
- ❌ Blocks if: balance < amount

## Error Messages

### Insufficient Funds
```json
{
  "success": false,
  "error": "Insufficient funds",
  "current_balance": 14630,
  "required_amount": 116000,
  "shortfall": 101370,
  "agent_message": "I'm sorry, but you don't have enough funds..."
}
```

**AI Agent Should:**
- Read the agent_message to user
- Offer to add funds
- State exact shortfall amount

### Invalid Amount
```json
{
  "success": false,
  "error": "Invalid amount",
  "agent_message": "I'm sorry, but the amount you provided is invalid..."
}
```

**AI Agent Should:**
- Ask for a valid positive amount
- Clarify what's wrong (e.g., "negative numbers aren't allowed")

### Amount Too Large
```json
{
  "success": false,
  "error": "Amount too large",
  "agent_message": "I'm sorry, but the amount exceeds our maximum..."
}
```

**AI Agent Should:**
- Explain the 999,999 limit
- Suggest splitting into multiple transactions

## Transaction Types

### Debit (Balance Check Required)
- `send_phone` - Send to phone number
- `paybill` - Pay bill
- `buy_goods_till` - Buy goods (Till)
- `buy_goods_pochi` - Buy goods (Pochi)
- `withdraw` - Withdraw money
- `bank_to_mpesa` - Bank to M-Pesa
- `mpesa_to_bank` - M-Pesa to bank

### Credit (No Balance Check)
- `deposit` - Add money to wallet
- `receive` - Receive money from others

## Example Scenarios

### Scenario 1: Sufficient Balance ✅
```
Balance: 14,630
Request: Send 1,000
Result: ✅ Transaction processed
New Balance: 13,630
```

### Scenario 2: Insufficient Balance ❌
```
Balance: 14,630
Request: Paybill 116,000
Result: ❌ Error returned
Message: "You need 101,370 more"
Action: Offer to add funds
```

### Scenario 3: Add Funds → Retry ✅
```
Balance: 14,630
Request: Add 105,000
Result: ✅ Deposit processed
New Balance: 119,630

Request: Paybill 116,000
Result: ✅ Payment processed
New Balance: 3,630
```

## Testing Commands

### Test Insufficient Funds
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

**Expected:** Error with shortfall details

### Test Sufficient Funds
```bash
curl -X POST https://ongeapesa.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "1000",
    "phone": "254712345678"
  }'
```

**Expected:** Success

### Test Invalid Amount
```bash
curl -X POST https://ongeapesa.vercel.app/api/voice/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "-500",
    "phone": "254712345678"
  }'
```

**Expected:** Error: Invalid amount

## Logs to Watch

### Success
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

## ElevenLabs Configuration

### Add to System Prompt
```
When you receive an error response:
1. Check if response.success is false
2. Read the agent_message field
3. Speak it naturally to the user
4. Offer helpful alternatives

For insufficient funds:
- Offer to add money to wallet
- State exact shortfall amount
- Ask if they want to proceed
```

### Tool Response Handling
```json
{
  "response_handling": {
    "success_field": "success",
    "error_message_field": "agent_message",
    "on_error": "Read agent_message and offer alternatives"
  }
}
```

## Benefits

✅ **Instant validation** - No waiting for database errors  
✅ **Clear feedback** - AI knows exactly what went wrong  
✅ **Better UX** - Natural conversation about errors  
✅ **Prevents failures** - Catches issues before processing  
✅ **Accurate info** - AI always has current balance  

## Next Steps

1. ✅ **Deploy updated webhook** - Push changes to production
2. ✅ **Update ElevenLabs agent** - Add error handling to system prompt
3. ✅ **Test all scenarios** - Verify insufficient funds, invalid amounts, etc.
4. ✅ **Monitor logs** - Watch for balance check messages

## Summary

The webhook now validates balance **before** processing transactions, providing immediate feedback to the ElevenLabs AI agent. This prevents database errors and creates a better user experience with natural, helpful error messages.

**Key Points:**
- Balance checked in real-time
- Errors returned immediately to AI agent
- AI can offer alternatives (add funds, smaller amount, etc.)
- No database constraint violations
- Better user experience

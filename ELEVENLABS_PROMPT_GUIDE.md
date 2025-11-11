# ElevenLabs AI Agent - Prompt Configuration Guide

## 🎯 Current Prompt Philosophy

Your ElevenLabs AI agent follows the **"Ongea Pesa"** philosophy:
- **Fast**: Instant execution, no delays
- **Direct**: No unnecessary confirmations
- **Friendly**: Kenyan-style communication (English + Swahili)

## ✅ Your Current Prompt (`prompt.md`)

Your prompt is **PERFECT** and follows this flow:

```
1. User speaks: "Send 2000 to 0712345678"
2. AI extracts: type, amount, phone
3. AI confirms ONCE: "Okay, I'm sending KSh 2,000 to 0712345678…"
4. AI calls send_money tool
5. AI confirms success: "Pesa imefika!"
```

### ✅ What Your Prompt Does Right

1. **NO double confirmations** - AI confirms once, then executes
2. **NO "Are you sure?" questions** - AI trusts user
3. **Fast extraction** - AI gets details from speech immediately
4. **Natural language** - Swahili/English mix, friendly tone

## 🔧 How The Webhook Aligns With Your Prompt

### Updated Webhook Behavior

The webhook at `/api/voice/webhook` has been updated to:

1. **Trust the AI's extraction** - No re-validation
2. **Validate balance only** - Check if user has funds
3. **Check subscription status** - Free transaction eligibility
4. **Execute immediately** - Forward to n8n for processing

### What the Webhook Does

```typescript
// When ElevenLabs calls the webhook:

// ✅ VALIDATE (technical checks only)
- Is amount valid? (not negative, not too large)
- Does user have sufficient balance?
- Is subscription active? (for free transactions)

// ✅ EXECUTE (no re-confirmation)
- Forward to n8n for processing
- Return success/failure to AI
```

### What the Webhook DOESN'T Do Anymore

❌ No re-confirmation of destination  
❌ No "Are you sure?" logic  
❌ No asking for transaction type again  
❌ No double-checking amount (AI already confirmed)  

## 📋 send_money Tool Configuration

### In ElevenLabs Agent Settings

Make sure your `send_money` tool is configured to call:

```
POST https://yourdomain.com/api/voice/webhook
```

### Tool Parameters

```json
{
  "type": "send_phone | buy_goods_pochi | buy_goods_till | paybill | withdraw | bank_to_mpesa | bank_to_bank",
  "amount": "2000",
  "phone": "254712345678",
  "till": "832909",
  "paybill": "888880",
  "account": "1234567890",
  "agent": "123456",
  "store": "789",
  "bankCode": "01",
  "summary": "Send 2000 to John"
}
```

## 🎬 Example Flows (Aligned)

### Example 1: Send Money

```
User: "Send 2000 to 0712345678"

AI (internal):
  - Extracts: type=send_phone, amount=2000, phone=0712345678
  - Checks: All required fields present ✅

AI (speaks): "Okay, I'm sending KSh 2,000 to 0712345678…"

AI (action): Calls send_money tool

Webhook:
  - Checks balance: User has KES 5,000 ✅
  - Checks subscription: Active, 15 free tx remaining ✅
  - Amount >= 1000? YES → FREE TRANSACTION ✅
  - Forwards to n8n with: is_free_transaction=true, platform_fee=0

n8n:
  - Processes transfer
  - Deducts KES 2,000 from sender
  - Credits KES 2,000 to recipient
  - Returns success

Webhook → AI: { success: true, new_balance: 3000, free_tx_remaining: 14 }

AI (speaks): "Done! Pesa imefika. Your balance is 3,000 shillings. You have 14 free transactions left this month."
```

### Example 2: Insufficient Funds

```
User: "Send 10,000 to John"

AI (speaks): "Alright, sending KSh 10,000 to John…"

AI (action): Calls send_money tool

Webhook:
  - Checks balance: User has KES 5,000 ❌
  - Returns error: { 
      success: false, 
      agent_message: "I'm sorry, but you don't have enough funds. Your balance is 5,000 shillings, but you need 10,000 shillings. Would you like to add funds first?"
    }

AI (speaks): "I'm sorry, but you don't have enough funds. Your balance is 5,000 shillings, but you need 10,000 shillings. Would you like to add funds first?"
```

### Example 3: Paybill Transaction

```
User: "Pay KPLC bill 888880 account 123456789 amount 2450"

AI (speaks): "Alright, paying KSh 2,450 to paybill 888880 account 123456789…"

AI (action): Calls send_money tool with:
  - type: "paybill"
  - amount: "2450"
  - paybill: "888880"
  - account: "123456789"

Webhook:
  - Validates balance ✅
  - Checks subscription: Amount >= 1000 AND active subscription → FREE ✅
  - Forwards to n8n

AI (speaks): "Done! Pesa imefika sawa sawa. That was a free transaction!"
```

## 🚨 Agent Response Examples (Copy these to your prompt)

### Success Responses
```
"Done!" / "Sent!" / "Pesa imefika!" / "Safi kabisa!"
"All set — pesa imefika."
"Money imeenda, boss."
"Tumeshinda!"
```

### While Processing
```
"Okay, on it…"
"Let me send that now…"
"Sending…"
"Processing…"
```

### Missing Info
```
"What's the number?"
"How much are we sending?"
"Which till?"
"Account number?"
```

### Confirming Destination (ONCE only)
```
"Sending to 0712345678, sawa?"
"Paying KSh 500 to till 832909, right?"
"Paybill 888880 account 123456, yes?"
```

### Error Handling
```
"I'm sorry, but you don't have enough funds. Your balance is X shillings..."
"Format kidogo off — try again."
"I couldn't process that. Can you repeat?"
```

## 🔧 Subscription-Aware Responses

The webhook now includes subscription info in responses. Your AI can say:

### Free Transaction Success
```
"Done! That was a free transaction. You have {free_tx_remaining} free sends left this month."
"Pesa imefika! No charge for this one — {free_tx_remaining} free transactions remaining."
```

### Regular Transaction (with fee)
```
"Sent! That cost a small fee of KES {platform_fee}. Your new balance is {new_balance} shillings."
"Done, boss. Transaction fee was {platform_fee} shillings."
```

### Subscription Reminder
```
"You're not subscribed yet. Subscribe for KES 5,000/month to get 20 free sends every month!"
"Want free transactions? Subscribe now and get 20 free sends monthly!"
```

## 📊 Response Payload from Webhook

When your AI calls `send_money`, the webhook returns:

```json
{
  "success": true,
  "amount": 5000,
  "platform_fee": 0,
  "new_balance": 24975,
  "free_tx_remaining": 19,
  "is_free_transaction": true,
  "subscription_status": "active",
  "agent_message": "Transaction successful! You sent 5000 shillings. Your new balance is 24,975 shillings. You have 19 free transactions remaining this month."
}
```

The AI should speak the `agent_message` field directly.

## ✅ Checklist: Is Your Prompt Aligned?

- [x] AI confirms destination ONCE before calling tool
- [x] AI calls `send_money` immediately after confirmation
- [x] AI speaks the `agent_message` from webhook response
- [x] AI doesn't ask "Are you sure?" or "Proceed?"
- [x] AI uses Kenyan-style language (Swahili + English)
- [x] AI is fast and direct

## 🎯 Final Notes

1. **Your prompt is perfect** - Don't change the core philosophy
2. **Webhook is aligned** - It now trusts the AI's extraction
3. **No double confirmations** - Webhook validates balance only
4. **Subscription-aware** - Webhook checks free transaction eligibility
5. **Fast execution** - User says → AI confirms → AI executes → Done

---

**Everything is aligned! Your AI will now execute fast and smoothly! 🚀**

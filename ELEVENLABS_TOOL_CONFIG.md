# ElevenLabs send_money Tool - Quick Configuration

## 🎯 Copy-Paste Configuration

### Tool Settings
- **Type**: Webhook
- **Name**: `send_money`
- **Description**: `Sends transaction details to process M-Pesa payments`
- **URL**: `https://YOUR-NEXTJS-APP.vercel.app/api/voice/webhook`
- **Method**: POST
- **Timeout**: 20 seconds

---

## 📋 Query Parameters (Add in ElevenLabs UI)

| Parameter | Type | Required | Value Type | Description |
|-----------|------|----------|------------|-------------|
| `request` | string | ✅ Yes | llm_prompt | The full user request verbatim |

---

## 📦 Request Body Schema (Add in ElevenLabs UI)

### Root Object
- **Type**: object
- **Description**: Transaction parameters extracted from user speech

### Properties

| Field | Type | Required | Enum Values | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | ✅ Yes | see below | Transaction type |
| `amount` | string | ✅ Yes | - | Amount in KSH |
| `phone` | string | ❌ No | - | Phone number (254XXXXXXXXX) |
| `till` | string | ❌ No | - | Till number (5-7 digits) |
| `paybill` | string | ❌ No | - | Paybill number |
| `account` | string | ❌ No | - | Account number |
| `agent` | string | ❌ No | - | Agent number |
| `store` | string | ❌ No | - | Store number |
| `bankCode` | string | ❌ No | - | Bank code (01, 11, etc) |
| `summary` | string | ✅ Yes | - | Transaction summary |

### Transaction Type Enum Values
```
send_phone
buy_goods_pochi
buy_goods_till
paybill
withdraw
bank_to_mpesa
bank_to_bank
```

---

## 🔧 JSON Configuration (For API Setup)

If ElevenLabs allows JSON import, use this:

```json
{
  "name": "send_money",
  "type": "webhook",
  "description": "Sends transaction details to process M-Pesa payments",
  "url": "https://YOUR-NEXTJS-APP.vercel.app/api/voice/webhook",
  "method": "POST",
  "timeout_secs": 20,
  "query_params": {
    "request": {
      "type": "string",
      "required": true,
      "value_type": "llm_prompt",
      "description": "The full user request"
    }
  },
  "body_schema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "required": true,
        "value_type": "llm_prompt",
        "enum": ["send_phone", "buy_goods_pochi", "buy_goods_till", "paybill", "withdraw", "bank_to_mpesa", "bank_to_bank"],
        "description": "Transaction type"
      },
      "amount": {
        "type": "string",
        "required": true,
        "value_type": "llm_prompt",
        "description": "Amount in KSH"
      },
      "phone": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Phone number (254XXXXXXXXX)"
      },
      "till": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Till number"
      },
      "paybill": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Paybill number"
      },
      "account": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Account number"
      },
      "agent": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Agent number"
      },
      "store": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Store number"
      },
      "bankCode": {
        "type": "string",
        "required": false,
        "value_type": "llm_prompt",
        "description": "Bank code"
      },
      "summary": {
        "type": "string",
        "required": true,
        "value_type": "llm_prompt",
        "description": "Transaction summary"
      }
    }
  }
}
```

---

## ✅ Checklist

Before saving your ElevenLabs tool:

- [ ] Changed URL from n8n to Next.js API
- [ ] Added `request` query parameter
- [ ] Added all 10 body properties
- [ ] Set `type` and `amount` as required
- [ ] Set enum values for `type` field
- [ ] Set timeout to 20 seconds
- [ ] Tested with a sample voice command

---

## 🧪 Test Commands

After configuration, test with these voice commands:

1. **Simple Send**: "Send 100 to 0712345678"
2. **Paybill**: "Pay KPLC 888880 account 123456, 2450 shillings"
3. **Till**: "Lipa till 832909, 1000 bob"
4. **Swahili**: "Tuma pesa 500 kwa mama 0798765432"

---

## 📊 Expected Flow

```
User: "Send 1000 to 0712345678"
  ↓
ElevenLabs extracts:
{
  "type": "send_phone",
  "amount": "1000",
  "phone": "254712345678",
  "summary": "Send 1000 to phone number"
}
  ↓
Calls: POST https://your-app.vercel.app/api/voice/webhook?request=Send+1000+to+0712345678
  ↓
Next.js API adds user context:
{
  "user": { "id": "...", "email": "..." },
  "transaction": { ... }
}
  ↓
Forwards to n8n:
POST https://primary-production-579c.up.railway.app/webhook/...
  ↓
n8n processes and returns result
  ↓
Agent says: "Sent!"
```

---

## 🐛 Common Issues

### Tool Not Being Called
- Check system prompt mentions `send_money` tool
- Verify tool is enabled in agent settings
- Test with explicit command: "Use send_money tool to send 100 to 0712345678"

### Wrong Parameters
- Check enum values are exact match
- Verify llm_prompt as value_type
- Ensure required fields are marked

### Timeout Errors
- Check Next.js API is responding
- Verify n8n webhook is reachable
- Increase timeout if needed (max 30s)

---

## 📞 Support

If issues persist:
1. Check ElevenLabs agent logs
2. Check Next.js API logs (Vercel)
3. Check n8n execution logs
4. Verify all URLs are correct

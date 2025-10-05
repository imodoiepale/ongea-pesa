# ElevenLabs AI Agent - Error Handling Configuration

## Overview

Configure your ElevenLabs AI agent to handle balance validation errors and provide natural, helpful responses to users.

## Agent System Prompt

Add this to your ElevenLabs agent's system prompt:

```
You are a helpful M-Pesa assistant. When processing transactions:

1. ALWAYS check the response from the transaction webhook
2. If response.success is false, read the agent_message field
3. Speak the agent_message naturally to the user
4. Offer helpful alternatives based on the error type

ERROR HANDLING:

Insufficient Funds:
- Read the agent_message which includes current balance, required amount, and shortfall
- Offer to help add funds to their wallet
- Example: "I'm sorry, you don't have enough funds. Your balance is 14,630 shillings but you need 116,000. Would you like to add 101,370 shillings to your wallet first?"

Invalid Amount:
- Politely ask for a valid amount
- Example: "I'm sorry, that amount isn't valid. Please tell me a positive amount you'd like to send."

Amount Too Large:
- Explain the limit and suggest a smaller amount
- Example: "That amount exceeds our limit of 999,999 shillings. Would you like to split it into smaller transactions?"

ALWAYS:
- Be empathetic and helpful
- Provide specific numbers (balance, shortfall, etc.)
- Offer clear next steps
- Ask if they want to try again or do something else
```

## Tool Configuration

### Send Money Tool

```json
{
  "name": "send_money",
  "description": "Send money to a phone number via M-Pesa",
  "url": "https://ongeapesa.vercel.app/api/voice/webhook",
  "method": "POST",
  "parameters": {
    "type": {
      "type": "string",
      "description": "Transaction type",
      "enum": ["send_phone"],
      "required": true
    },
    "amount": {
      "type": "number",
      "description": "Amount in KSh",
      "required": true
    },
    "phone": {
      "type": "string",
      "description": "Recipient phone number",
      "required": true
    }
  },
  "response_handling": {
    "success_field": "success",
    "error_message_field": "agent_message",
    "on_success": "Confirm transaction and state new balance",
    "on_error": "Read agent_message and offer alternatives"
  }
}
```

### Paybill Tool

```json
{
  "name": "pay_bill",
  "description": "Pay a bill via M-Pesa paybill",
  "url": "https://ongeapesa.vercel.app/api/voice/webhook",
  "method": "POST",
  "parameters": {
    "type": {
      "type": "string",
      "description": "Transaction type",
      "enum": ["paybill"],
      "required": true
    },
    "amount": {
      "type": "number",
      "description": "Amount in KSh",
      "required": true
    },
    "paybill": {
      "type": "string",
      "description": "Paybill number",
      "required": true
    },
    "account": {
      "type": "string",
      "description": "Account number",
      "required": true
    }
  },
  "response_handling": {
    "success_field": "success",
    "error_message_field": "agent_message",
    "on_success": "Confirm payment and state new balance",
    "on_error": "Read agent_message and offer to add funds if needed"
  }
}
```

### Add Balance Tool

```json
{
  "name": "add_balance",
  "description": "Add money to wallet",
  "url": "https://ongeapesa.vercel.app/api/voice/webhook",
  "method": "POST",
  "parameters": {
    "type": {
      "type": "string",
      "description": "Transaction type",
      "enum": ["deposit"],
      "required": true
    },
    "amount": {
      "type": "number",
      "description": "Amount to add in KSh",
      "required": true
    }
  },
  "response_handling": {
    "success_field": "success",
    "on_success": "Confirm deposit and state new balance"
  }
}
```

## Conversation Flow Examples

### Example 1: Insufficient Funds → Add Balance → Retry

```
User: "Pay bill 335577 account 292927 amount 116000"

Agent: [Calls pay_bill tool]
        ↓
        Response: {
          "success": false,
          "error": "Insufficient funds",
          "current_balance": 14630,
          "required_amount": 116000,
          "shortfall": 101370,
          "agent_message": "I'm sorry, but you don't have enough funds..."
        }
        ↓
Agent: "I'm sorry, but you don't have enough funds for this transaction. 
        Your current balance is 14,630 shillings, but you're trying to send 
        116,000 shillings. You need 101,370 shillings more. Would you like 
        to add funds to your wallet first?"

User: "Yes, add 105000"

Agent: [Calls add_balance tool with amount: 105000]
        ↓
        Response: {
          "success": true,
          "message": "Deposit successful",
          "new_balance": 119630
        }
        ↓
Agent: "Great! I've added 105,000 shillings to your wallet. Your new 
        balance is 119,630 shillings. Would you like me to process that 
        paybill payment now?"

User: "Yes please"

Agent: [Calls pay_bill tool again]
        ↓
        Response: {
          "success": true,
          "message": "Payment successful",
          "new_balance": 3630
        }
        ↓
Agent: "Perfect! I've paid 116,000 shillings to paybill 335577 for 
        account 292927. Your new balance is 3,630 shillings."
```

### Example 2: Amount Too Large → Suggest Alternative

```
User: "Send 2 million to 0712345678"

Agent: [Calls send_money tool]
        ↓
        Response: {
          "success": false,
          "error": "Amount too large",
          "agent_message": "I'm sorry, but the amount of 2,000,000 shillings 
                           exceeds our maximum transaction limit..."
        }
        ↓
Agent: "I'm sorry, but the amount of 2,000,000 shillings exceeds our 
        maximum transaction limit of 999,999 shillings. Would you like 
        to split this into multiple transactions? For example, I could 
        send 999,999 now and 1,000,001 in a second transaction."

User: "Just send 500,000 for now"

Agent: [Calls send_money tool with amount: 500000]
        ↓
        Response: {
          "success": true,
          "message": "Transaction successful"
        }
        ↓
Agent: "Done! I've sent 500,000 shillings to 0712345678."
```

### Example 3: Invalid Amount → Ask for Clarification

```
User: "Send negative 500 to 0712345678"

Agent: [Calls send_money tool]
        ↓
        Response: {
          "success": false,
          "error": "Invalid amount",
          "agent_message": "I'm sorry, but the amount you provided is invalid..."
        }
        ↓
Agent: "I'm sorry, but the amount you provided is invalid. Please tell 
        me a positive amount you'd like to send to 0712345678."

User: "500 shillings"

Agent: [Calls send_money tool with amount: 500]
        ↓
        Response: {
          "success": true
        }
        ↓
Agent: "Perfect! I've sent 500 shillings to 0712345678."
```

## Response Parsing Logic

Your agent should parse responses like this:

```javascript
// Pseudo-code for agent logic
function handleTransactionResponse(response) {
  if (response.success === false) {
    // Transaction failed - read error message
    const errorMessage = response.agent_message || response.message
    
    // Speak the error naturally
    speak(errorMessage)
    
    // Offer alternatives based on error type
    if (response.error === "Insufficient funds") {
      const shortfall = response.shortfall
      offerToAddFunds(shortfall)
    } else if (response.error === "Amount too large") {
      suggestSmallerAmount()
    } else if (response.error === "Invalid amount") {
      askForValidAmount()
    }
  } else {
    // Transaction succeeded
    const successMessage = response.message
    speak(successMessage)
    
    // Optionally state new balance if available
    if (response.new_balance) {
      speak(`Your new balance is ${response.new_balance} shillings.`)
    }
  }
}
```

## Natural Language Patterns

Train your agent to recognize these patterns:

### Adding Funds
- "Add 1000 to my wallet"
- "Top up 5000"
- "Deposit 10000 shillings"
- "Put 2000 in my account"

### Retrying After Error
- "Try again"
- "Yes, do it now"
- "Process that payment"
- "Send it"

### Checking Balance
- "What's my balance?"
- "How much do I have?"
- "Check my wallet"
- "Balance inquiry"

### Canceling
- "Never mind"
- "Cancel that"
- "Forget it"
- "Not now"

## Testing Your Configuration

### Test 1: Insufficient Funds Flow
```
Say: "Pay bill 335577 account 292927 amount 116000"
Expected: Agent explains insufficient funds and offers to add money
Say: "Yes, add 105000"
Expected: Agent confirms deposit and asks if you want to retry
Say: "Yes"
Expected: Agent processes payment successfully
```

### Test 2: Amount Validation
```
Say: "Send negative 500 to 0712345678"
Expected: Agent explains invalid amount and asks for valid one
Say: "500 shillings"
Expected: Agent processes transaction
```

### Test 3: Maximum Limit
```
Say: "Send 2 million to 0712345678"
Expected: Agent explains limit and suggests alternatives
Say: "Send 500000 instead"
Expected: Agent processes transaction
```

## Webhook Response Structure

Your agent will receive these response structures:

### Success Response
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "transaction_id": "tx_123456",
  "data": {
    "type": "send_phone",
    "amount": 1000,
    "status": "completed"
  }
}
```

### Error Response
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

## Summary

✅ **Configure system prompt** - Add error handling instructions  
✅ **Parse responses** - Check success field and read agent_message  
✅ **Offer alternatives** - Suggest adding funds or smaller amounts  
✅ **Natural conversation** - Make errors feel like helpful guidance  
✅ **Test thoroughly** - Verify all error scenarios work smoothly  

Your ElevenLabs agent will now handle balance validation errors gracefully and provide helpful, natural responses to users!

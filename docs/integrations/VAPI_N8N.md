# Vapi Voice Agent + n8n Integration for Ongea Pesa
## Ultra-Fast Voice-to-Payment Processing

### Architecture Overview
```
User Voice → Vapi Agent → n8n Workflows → M-Pesa → Response → Vapi TTS → User
```

---

## 1. Vapi Voice Agent Configuration

### Create Vapi Assistant
```json
{
  "name": "Ongea Pesa Payment Assistant",
  "model": {
    "provider": "openai",
    "model": "gpt-4",
    "messages": [
      {
        "role": "system",
        "content": "You are Ongea Pesa, a voice payment assistant. Extract payment details from user commands like 'Send 1000 to John' and call the payment function. Always confirm amounts and recipients before processing. Speak in a friendly, professional tone."
      }
    ],
    "functions": [
      {
        "name": "process_payment",
        "description": "Process a money transfer payment",
        "parameters": {
          "type": "object",
          "properties": {
            "amount": {
              "type": "number",
              "description": "Amount to send in KES"
            },
            "recipient": {
              "type": "string", 
              "description": "Name or phone number of recipient"
            },
            "sender_phone": {
              "type": "string",
              "description": "Sender's phone number"
            }
          },
          "required": ["amount", "recipient", "sender_phone"]
        }
      },
      {
        "name": "check_balance",
        "description": "Check user's account balance",
        "parameters": {
          "type": "object",
          "properties": {
            "phone_number": {
              "type": "string",
              "description": "User's phone number"
            }
          },
          "required": ["phone_number"]
        }
      }
    ]
  },
  "voice": {
    "provider": "11labs",
    "voiceId": "your-elevenlabs-voice-id",
    "speed": 1.1,
    "stability": 0.8,
    "similarityBoost": 0.8
  },
  "serverUrl": "https://your-n8n-instance.com/webhook/vapi-payment",
  "serverUrlSecret": "your-webhook-secret"
}
```

### Vapi Phone Number Setup
```bash
# Create phone number for voice calls
curl -X POST https://api.vapi.ai/phone-number \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "twilio",
    "number": "+1234567890",
    "assistantId": "your-assistant-id"
  }'
```

---

## 2. n8n Workflow: Voice Payment Processing

### Main Payment Workflow
```json
{
  "name": "Ongea Pesa Voice Payment",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "vapi-payment",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Vapi Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.message.function_call.name}}",
              "operation": "equal",
              "value2": "process_payment"
            }
          ]
        }
      },
      "id": "check-function",
      "name": "Check Function Call",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "jsCode": "// Extract payment details from Vapi function call\nconst functionCall = $input.first().json.message.function_call;\nconst args = JSON.parse(functionCall.arguments);\n\n// Validate and format data\nconst paymentData = {\n  amount: parseFloat(args.amount),\n  recipient: args.recipient.trim(),\n  senderPhone: args.sender_phone.replace(/\\D/g, ''), // Remove non-digits\n  timestamp: new Date().toISOString(),\n  sessionId: $input.first().json.call?.id || 'unknown'\n};\n\n// Validate amount\nif (paymentData.amount <= 0 || paymentData.amount > 100000) {\n  throw new Error('Invalid amount. Must be between 1 and 100,000 KES');\n}\n\n// Format phone numbers\nif (!paymentData.senderPhone.startsWith('254')) {\n  paymentData.senderPhone = '254' + paymentData.senderPhone.substring(1);\n}\n\nreturn { paymentData };"
      },
      "id": "extract-payment-data",
      "name": "Extract Payment Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [680, 200]
    },
    {
      "parameters": {
        "url": "https://api.supabase.co/rest/v1/contacts",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer YOUR_SUPABASE_KEY"
        },
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "name",
              "value": "ilike.%{{$json.paymentData.recipient}}%"
            },
            {
              "name": "user_phone",
              "value": "eq.{{$json.paymentData.senderPhone}}"
            }
          ]
        }
      },
      "id": "find-recipient",
      "name": "Find Recipient",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [900, 200]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.length}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      },
      "id": "recipient-found",
      "name": "Recipient Found?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1120, 200]
    },
    {
      "parameters": {
        "jsCode": "// Get recipient details\nconst recipients = $input.first().json;\nconst paymentData = $('Extract Payment Data').first().json.paymentData;\n\nif (recipients.length === 0) {\n  throw new Error(`Recipient '${paymentData.recipient}' not found in contacts`);\n}\n\nconst recipient = recipients[0];\n\nreturn {\n  ...paymentData,\n  recipientPhone: recipient.phone_number,\n  recipientName: recipient.name,\n  recipientId: recipient.contact_id\n};"
      },
      "id": "prepare-mpesa-request",
      "name": "Prepare M-Pesa Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1340, 120]
    },
    {
      "parameters": {
        "url": "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Basic {{Buffer.from(process.env.MPESA_CONSUMER_KEY + ':' + process.env.MPESA_CONSUMER_SECRET).toString('base64')}}"
        }
      },
      "id": "mpesa-auth",
      "name": "M-Pesa Auth Token",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1560, 120]
    },
    {
      "parameters": {
        "url": "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer {{$('M-Pesa Auth Token').first().json.access_token}}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "jsonParameters": {
          "parameters": [
            {
              "name": "BusinessShortCode",
              "value": "174379"
            },
            {
              "name": "Password",
              "value": "{{Buffer.from('174379' + 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)).toString('base64')}}"
            },
            {
              "name": "Timestamp",
              "value": "{{new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}}"
            },
            {
              "name": "TransactionType",
              "value": "CustomerPayBillOnline"
            },
            {
              "name": "Amount",
              "value": "={{$('Prepare M-Pesa Request').first().json.amount}}"
            },
            {
              "name": "PartyA",
              "value": "={{$('Prepare M-Pesa Request').first().json.senderPhone}}"
            },
            {
              "name": "PartyB",
              "value": "174379"
            },
            {
              "name": "PhoneNumber",
              "value": "={{$('Prepare M-Pesa Request').first().json.senderPhone}}"
            },
            {
              "name": "CallBackURL",
              "value": "https://your-n8n-instance.com/webhook/mpesa-callback"
            },
            {
              "name": "AccountReference",
              "value": "ONGEA{{Math.random().toString(36).substr(2, 9).toUpperCase()}}"
            },
            {
              "name": "TransactionDesc",
              "value": "Send {{$('Prepare M-Pesa Request').first().json.amount}} to {{$('Prepare M-Pesa Request').first().json.recipientName}}"
            }
          ]
        }
      },
      "id": "mpesa-stk-push",
      "name": "M-Pesa STK Push",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1780, 120]
    },
    {
      "parameters": {
        "url": "https://api.supabase.co/rest/v1/transactions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer YOUR_SUPABASE_KEY"
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Prefer",
              "value": "return=representation"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "jsonParameters": {
          "parameters": [
            {
              "name": "sender_phone",
              "value": "={{$('Prepare M-Pesa Request').first().json.senderPhone}}"
            },
            {
              "name": "recipient_phone",
              "value": "={{$('Prepare M-Pesa Request').first().json.recipientPhone}}"
            },
            {
              "name": "recipient_name",
              "value": "={{$('Prepare M-Pesa Request').first().json.recipientName}}"
            },
            {
              "name": "amount",
              "value": "={{$('Prepare M-Pesa Request').first().json.amount}}"
            },
            {
              "name": "status",
              "value": "pending"
            },
            {
              "name": "mpesa_checkout_id",
              "value": "={{$('M-Pesa STK Push').first().json.CheckoutRequestID}}"
            },
            {
              "name": "voice_command_text",
              "value": "={{$('Vapi Webhook').first().json.message.content}}"
            }
          ]
        }
      },
      "id": "log-transaction",
      "name": "Log Transaction",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [2000, 120]
    },
    {
      "parameters": {
        "jsCode": "// Generate success response for Vapi\nconst paymentData = $('Prepare M-Pesa Request').first().json;\nconst mpesaResponse = $('M-Pesa STK Push').first().json;\n\nlet responseMessage;\n\nif (mpesaResponse.ResponseCode === '0') {\n  responseMessage = `Perfect! I'm sending ${paymentData.amount} shillings to ${paymentData.recipientName}. Please check your phone and enter your M-Pesa PIN to confirm the payment.`;\n} else {\n  responseMessage = `Sorry, there was an issue processing your payment. ${mpesaResponse.ResponseDescription || 'Please try again later.'}`;\n}\n\nreturn {\n  message: responseMessage,\n  success: mpesaResponse.ResponseCode === '0',\n  transactionId: mpesaResponse.CheckoutRequestID,\n  amount: paymentData.amount,\n  recipient: paymentData.recipientName\n};"
      },
      "id": "format-response",
      "name": "Format Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [2220, 120]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{JSON.stringify($json)}}"
      },
      "id": "vapi-response",
      "name": "Send to Vapi",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [2440, 120]
    },
    {
      "parameters": {
        "jsCode": "// Handle recipient not found\nconst paymentData = $('Extract Payment Data').first().json.paymentData;\n\nreturn {\n  message: `I couldn't find '${paymentData.recipient}' in your contacts. Please add them first or say their full phone number starting with 254.`,\n  success: false,\n  error: 'RECIPIENT_NOT_FOUND'\n};"
      },
      "id": "recipient-not-found",
      "name": "Recipient Not Found",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1340, 280]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{JSON.stringify($json)}}"
      },
      "id": "error-response",
      "name": "Error Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1560, 280]
    }
  ],
  "connections": {
    "Vapi Webhook": {
      "main": [
        [
          {
            "node": "Check Function Call",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Function Call": {
      "main": [
        [
          {
            "node": "Extract Payment Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Payment Data": {
      "main": [
        [
          {
            "node": "Find Recipient",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Find Recipient": {
      "main": [
        [
          {
            "node": "Recipient Found?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Recipient Found?": {
      "main": [
        [
          {
            "node": "Prepare M-Pesa Request",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Recipient Not Found",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prepare M-Pesa Request": {
      "main": [
        [
          {
            "node": "M-Pesa Auth Token",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "M-Pesa Auth Token": {
      "main": [
        [
          {
            "node": "M-Pesa STK Push",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "M-Pesa STK Push": {
      "main": [
        [
          {
            "node": "Log Transaction",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Log Transaction": {
      "main": [
        [
          {
            "node": "Format Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Response": {
      "main": [
        [
          {
            "node": "Send to Vapi",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Recipient Not Found": {
      "main": [
        [
          {
            "node": "Error Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 3. n8n Workflow: Balance Check

### Balance Check Workflow
```json
{
  "name": "Ongea Pesa Balance Check",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "vapi-balance",
        "responseMode": "responseNode"
      },
      "id": "balance-webhook",
      "name": "Balance Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "jsCode": "// Extract phone number from Vapi request\nconst functionCall = $input.first().json.message.function_call;\nconst args = JSON.parse(functionCall.arguments);\n\nlet phoneNumber = args.phone_number.replace(/\\D/g, '');\nif (!phoneNumber.startsWith('254')) {\n  phoneNumber = '254' + phoneNumber.substring(1);\n}\n\nreturn { phoneNumber };"
      },
      "id": "extract-phone",
      "name": "Extract Phone",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "https://api.supabase.co/rest/v1/users",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer YOUR_SUPABASE_KEY"
        },
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "phone_number",
              "value": "eq.{{$json.phoneNumber}}"
            },
            {
              "name": "select",
              "value": "balance,full_name"
            }
          ]
        }
      },
      "id": "get-balance",
      "name": "Get User Balance",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "jsCode": "// Format balance response\nconst users = $input.first().json;\n\nif (users.length === 0) {\n  return {\n    message: \"I couldn't find your account. Please make sure you're registered with Ongea Pesa.\",\n    success: false\n  };\n}\n\nconst user = users[0];\nconst balance = parseFloat(user.balance || 0);\n\nreturn {\n  message: `Hi ${user.full_name}! Your current balance is ${balance.toLocaleString()} Kenya shillings.`,\n  success: true,\n  balance: balance\n};"
      },
      "id": "format-balance-response",
      "name": "Format Balance Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [900, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{JSON.stringify($json)}}"
      },
      "id": "balance-response",
      "name": "Balance Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1120, 300]
    }
  ],
  "connections": {
    "Balance Webhook": {
      "main": [
        [
          {
            "node": "Extract Phone",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Phone": {
      "main": [
        [
          {
            "node": "Get User Balance",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get User Balance": {
      "main": [
        [
          {
            "node": "Format Balance Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Balance Response": {
      "main": [
        [
          {
            "node": "Balance Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 4. M-Pesa Callback Handler

### M-Pesa Callback Workflow
```json
{
  "name": "M-Pesa Callback Handler",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "mpesa-callback",
        "responseMode": "responseNode"
      },
      "id": "mpesa-callback",
      "name": "M-Pesa Callback",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "jsCode": "// Process M-Pesa callback\nconst callback = $input.first().json;\nconst stkCallback = callback.Body.stkCallback;\n\nconst checkoutRequestID = stkCallback.CheckoutRequestID;\nconst resultCode = stkCallback.ResultCode;\nconst resultDesc = stkCallback.ResultDesc;\n\nlet status = 'failed';\nlet mpesaReceiptNumber = null;\n\nif (resultCode === 0) {\n  status = 'completed';\n  // Extract receipt number from callback items\n  const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];\n  const receiptItem = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber');\n  mpesaReceiptNumber = receiptItem?.Value;\n}\n\nreturn {\n  checkoutRequestID,\n  status,\n  resultCode,\n  resultDesc,\n  mpesaReceiptNumber\n};"
      },
      "id": "process-callback",
      "name": "Process Callback",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "https://api.supabase.co/rest/v1/transactions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer YOUR_SUPABASE_KEY"
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Prefer",
              "value": "return=representation"
            }
          ]
        },
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "mpesa_checkout_id",
              "value": "eq.{{$json.checkoutRequestID}}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "jsonParameters": {
          "parameters": [
            {
              "name": "status",
              "value": "={{$json.status}}"
            },
            {
              "name": "mpesa_receipt_number",
              "value": "={{$json.mpesaReceiptNumber}}"
            },
            {
              "name": "processed_at",
              "value": "={{new Date().toISOString()}}"
            }
          ]
        }
      },
      "id": "update-transaction",
      "name": "Update Transaction",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\"ResultCode\": 0, \"ResultDesc\": \"Success\"}"
      },
      "id": "callback-response",
      "name": "Callback Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [900, 300]
    }
  ],
  "connections": {
    "M-Pesa Callback": {
      "main": [
        [
          {
            "node": "Process Callback",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Callback": {
      "main": [
        [
          {
            "node": "Update Transaction",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Update Transaction": {
      "main": [
        [
          {
            "node": "Callback Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 5. Frontend Integration

### Connect UI to Vapi
```javascript
// In your existing UI component
import Vapi from '@vapi-ai/web';

const vapi = new Vapi('YOUR_VAPI_PUBLIC_KEY');

// Voice button handler
const handleVoicePayment = async () => {
  try {
    // Start voice conversation
    await vapi.start({
      assistantId: 'your-payment-assistant-id',
      metadata: {
        userPhone: currentUser.phoneNumber,
        userId: currentUser.id
      }
    });
    
    // Listen for function calls
    vapi.on('function-call', (functionCall) => {
      console.log('Payment function called:', functionCall);
    });
    
    // Listen for responses
    vapi.on('speech-end', (response) => {
      console.log('AI response:', response);
    });
    
  } catch (error) {
    console.error('Voice payment error:', error);
  }
};

// Add to your existing voice button
<button onClick={handleVoicePayment}>
  🎤 Send Money
</button>
```

---

## 6. Environment Variables

### n8n Environment Setup
```bash
# Add to your n8n environment
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_mpesa_passkey
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
VAPI_API_KEY=your_vapi_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

---

## 7. Quick Setup Steps

### 1. Create Vapi Assistant (5 minutes)
```bash
curl -X POST https://api.vapi.ai/assistant \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @vapi-assistant-config.json
```

### 2. Import n8n Workflows (2 minutes)
- Import the 3 JSON workflows into your n8n instance
- Update webhook URLs and credentials
- Activate all workflows

### 3. Connect Frontend (1 minute)
- Add Vapi SDK to your existing UI
- Replace voice button handler with Vapi integration

### 4. Test End-to-End (2 minutes)
- Call Vapi phone number or use web SDK
- Say "Send 1000 to John"
- Verify M-Pesa STK push received
- Confirm transaction logged in database

**Total Setup Time: ~10 minutes**

This integration gives you ultra-fast voice-to-payment processing with all backend logic handled by n8n workflows, eliminating the need for a separate API server.

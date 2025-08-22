# Ongea Pesa API Documentation

## Overview
Comprehensive API reference for Ongea Pesa voice-activated fintech platform with centralized wallet architecture, real-time voice processing, OCR document extraction, and multi-payment method integration.

**Base URL**: `https://api.ongea-pesa.com/v1`
**Authentication**: Bearer Token + Biometric/PIN verification for sensitive operations
**Rate Limiting**: 1000 requests/hour per user, 10000/hour for premium accounts

---

## Authentication & Security

### POST `/auth/login`
**Purpose**: User authentication with multiple methods
```json
{
  "phone_number": "+254712345678",
  "method": "pin|biometric|voice_verification",
  "credentials": "encrypted_pin_or_biometric_hash",
  "device_fingerprint": "unique_device_id"
}
```
**Response**: JWT token + refresh token + user profile

### POST `/auth/verify-transaction`
**Purpose**: Multi-factor verification for high-value transactions
```json
{
  "transaction_id": "uuid",
  "verification_methods": ["pin", "biometric", "voice"],
  "amount_threshold": 10000.00
}
```

---

## Core Payment Functions

### POST `/payments/send`
**Purpose**: Execute financial transactions across all supported channels
**n8n Webhook**: `POST /api/webhooks/make-payment`
**Auth Required**: Biometric/PIN for amounts > KES 5,000
**Response Time**: 2-15 seconds

```json
{
  "recipient": {
    "identifier": "+254712345678",
    "name": "John Doe",
    "method": "mpesa|bank_card|crypto|airtel"
  },
  "amount": 1500.00,
  "currency": "KES",
  "payment_method_id": "uuid",
  "reference": "optional_reference",
  "note": "Payment for lunch",
  "voice_command_id": "uuid"
}
```

**Response**:
```json
{
  "transaction_id": "uuid",
  "status": "pending|processing|completed|failed",
  "reference_number": "OP123456789",
  "estimated_completion": "2024-01-15T10:30:00Z",
  "fees": {
    "platform_fee": 5.00,
    "gateway_fee": 2.50,
    "total": 7.50
  }
}
```

### GET `/wallet/balance`
**Purpose**: Retrieve account balances across linked accounts
**n8n Webhook**: `GET /api/webhooks/get-balance`

```json
{
  "account_type": "main|mpesa|bank_card|crypto",
  "currency_filter": "KES|USD|BTC|ETH"
}
```

**Response**:
```json
{
  "main_wallet": {
    "total_balance": 25000.00,
    "available_balance": 24500.00,
    "pending_balance": 500.00,
    "currency": "KES"
  },
  "payment_methods": [
    {
      "method_id": "uuid",
      "type": "mpesa",
      "balance": 8000.00,
      "currency": "KES",
      "last_updated": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST `/payments/convert-currency`
**Purpose**: Exchange between currencies and payment methods
**Integration**: CoinGecko API, DEX aggregators, forex APIs

```json
{
  "from_currency": "KES",
  "to_currency": "USD",
  "amount": 1000.00,
  "from_account": "mpesa_account_id",
  "to_account": "bank_card_id",
  "slippage_tolerance": 0.5
}
```

---

## Voice Interaction APIs

### POST `/voice/process-command`
**Purpose**: Parse and understand natural language voice input
**Integration**: Whisper → GPT-4 → Intent classification

```json
{
  "audio_input": "base64_encoded_audio",
  "context": {
    "user_id": "uuid",
    "session_id": "uuid",
    "recent_transactions": []
  },
  "user_preferences": {
    "language": "en|sw|fr",
    "voice_style": "professional|friendly|urgent"
  }
}
```

**Response**:
```json
{
  "transcript": "Send 1000 shillings to John",
  "intent": "send_money",
  "entities": {
    "amount": 1000.00,
    "currency": "KES",
    "recipient": "John",
    "confidence": 0.95
  },
  "suggested_actions": [
    {
      "action": "make_payment",
      "parameters": {...}
    }
  ]
}
```

### POST `/voice/text-to-speech`
**Purpose**: Generate and play text-to-speech responses
**TTS Engine**: ElevenLabs with voice cloning

```json
{
  "text": "Payment of 1000 KES sent successfully to John",
  "voice_style": "professional",
  "language": "en",
  "speed": 1.0,
  "interrupt_current": false
}
```

### POST `/voice/calibrate-recognition`
**Purpose**: Personalize voice recognition for user
```json
{
  "user_samples": ["base64_audio1", "base64_audio2"],
  "accent": "kenyan_english",
  "speed_preference": 1.2
}
```

---

## OCR & Document Processing

### POST `/ocr/scan-document`
**Purpose**: Process images for text extraction and payment automation
**OCR Engine**: Google Vision API / Tesseract

```json
{
  "image_input": "base64_encoded_image",
  "document_type": "bill|receipt|id|meter_reading|invoice|qr_code",
  "expected_fields": ["amount", "account_number", "due_date"],
  "provider_hint": "KPLC|NCWSC|Safaricom"
}
```

**Response**:
```json
{
  "scan_id": "uuid",
  "extracted_data": {
    "amount": 2500.00,
    "account_number": "123456789",
    "due_date": "2024-01-31",
    "provider": "KPLC",
    "reference": "BILL123456"
  },
  "confidence_scores": {
    "amount": 0.98,
    "account_number": 0.95,
    "due_date": 0.92
  },
  "requires_validation": false
}
```

### POST `/ocr/process-qr-code`
**Purpose**: Decode QR codes for payment information
```json
{
  "image_input": "base64_encoded_image",
  "qr_type": "payment|contact|bill"
}
```

### POST `/ocr/validate-scan`
**Purpose**: Confirm OCR extraction accuracy with user
```json
{
  "scan_id": "uuid",
  "extracted_data": {...},
  "user_corrections": {
    "amount": 2600.00
  }
}
```

---

## Contact Management

### GET `/contacts`
**Purpose**: Retrieve contact list with payment preferences
```json
{
  "search_term": "John",
  "frequency_filter": "frequent|recent|all",
  "payment_method_filter": "mpesa|bank_card"
}
```

### POST `/contacts`
**Purpose**: Add new contact to payment address book
```json
{
  "name": "John Doe",
  "nickname": "Johnny",
  "phone": "+254712345678",
  "email": "john@example.com",
  "default_payment_method": "mpesa",
  "notes": "College friend"
}
```

### PUT `/contacts/{contact_id}`
**Purpose**: Modify existing contact information
```json
{
  "field": "phone_number",
  "new_value": "+254787654321"
}
```

### DELETE `/contacts/{contact_id}`
**Purpose**: Remove contact from address book
**Auth Required**: Voice confirmation
```json
{
  "confirm_deletion": true,
  "voice_confirmation": "base64_audio"
}
```

---

## Transaction History & Analytics

### GET `/transactions`
**Purpose**: Retrieve payment history with filtering
```json
{
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "amount_range": {
    "min": 100.00,
    "max": 10000.00
  },
  "contact_filter": "John Doe",
  "status_filter": "completed|pending|failed",
  "payment_method_filter": "mpesa",
  "page": 1,
  "limit": 50
}
```

### GET `/transactions/{transaction_id}`
**Purpose**: Fetch comprehensive transaction information
```json
{
  "include_voice_log": true,
  "include_fees_breakdown": true
}
```

### POST `/transactions/{transaction_id}/retry`
**Purpose**: Re-attempt failed or cancelled transactions
```json
{
  "retry_method": "different_payment_source",
  "new_parameters": {
    "payment_method_id": "alternative_method_uuid"
  }
}
```

### POST `/analytics/expense-report`
**Purpose**: Create detailed spending analysis and insights
```json
{
  "period": "monthly|weekly|yearly",
  "categories": ["utilities", "food", "transport"],
  "comparison_period": "previous_month",
  "export_format": "pdf|csv|json|voice_summary"
}
```

---

## Cryptocurrency Integration

### POST `/crypto/connect-wallet`
**Purpose**: Link cryptocurrency wallets to account
```json
{
  "wallet_type": "metamask|coinbase|trust_wallet|hardware",
  "connection_method": "walletconnect|api|address_import",
  "wallet_address": "0x742d35Cc6634C0532925a3b8D0Ea4E685C1c5C5E",
  "network": "ethereum|polygon|bsc|bitcoin"
}
```

### GET `/crypto/balance`
**Purpose**: Retrieve cryptocurrency balances
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b8D0Ea4E685C1c5C5E",
  "network": "ethereum",
  "include_tokens": true
}
```

### POST `/crypto/send`
**Purpose**: Execute cryptocurrency transactions
```json
{
  "recipient_address": "0x...",
  "amount": "1.5",
  "token_contract": "0x...", // null for native token
  "network": "ethereum",
  "gas_fee": "auto|fast|slow",
  "slippage_tolerance": 0.5
}
```

### POST `/crypto/swap`
**Purpose**: Exchange cryptocurrencies using DEX aggregators
```json
{
  "from_token": "ETH",
  "to_token": "USDC",
  "amount": "1.0",
  "slippage_tolerance": 0.5,
  "dex_preference": "1inch|uniswap|paraswap"
}
```

---

## Bill Management & Utilities

### GET `/bills`
**Purpose**: Retrieve outstanding utility bills
```json
{
  "provider": "KPLC|NCWSC|Safaricom",
  "account_number": "123456789",
  "due_date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

### POST `/bills/pay`
**Purpose**: Process regular bill payments
```json
{
  "bill_id": "uuid",
  "amount": 2500.00,
  "payment_method_id": "uuid",
  "schedule_autopay": true
}
```

### POST `/bills/setup-autopay`
**Purpose**: Configure automatic bill payments
```json
{
  "provider": "KPLC",
  "account_number": "123456789",
  "payment_method_id": "uuid",
  "schedule": {
    "frequency": "monthly",
    "day_before_due": 3,
    "max_amount": 5000.00
  }
}
```

### POST `/bills/split-payment`
**Purpose**: Divide bills among multiple people
```json
{
  "total_amount": 3000.00,
  "participants": [
    {
      "contact_id": "uuid",
      "amount": 1500.00
    },
    {
      "phone": "+254712345678",
      "amount": 1500.00
    }
  ],
  "split_method": "equal|percentage|custom"
}
```

---

## Security & Fraud Detection

### POST `/security/log-event`
**Purpose**: Record security activities for audit
```json
{
  "event_type": "login|failed_auth|suspicious_activity",
  "details": {
    "ip_address": "192.168.1.1",
    "device_fingerprint": "unique_id",
    "location": {...}
  },
  "risk_level": "low|medium|high|critical"
}
```

### POST `/security/check-fraud`
**Purpose**: Analyze transaction for potential fraud
```json
{
  "transaction_data": {
    "amount": 50000.00,
    "recipient": "+254712345678",
    "time_of_day": "02:30",
    "location": {...}
  },
  "user_profile": {
    "typical_transaction_size": 2000.00,
    "frequent_recipients": [...],
    "usual_transaction_times": [...]
  }
}
```

### POST `/security/enable-2fa`
**Purpose**: Set up additional security layer
```json
{
  "method": "sms|email|authenticator|hardware",
  "phone_number": "+254712345678",
  "email": "user@example.com"
}
```

---

## Notifications & Communication

### POST `/notifications/send`
**Purpose**: Send various types of notifications to users
```json
{
  "type": "payment_confirmation|security_alert|bill_reminder",
  "recipient": "user_id|phone|email",
  "message": "Your payment of KES 1,500 was successful",
  "urgency": "low|medium|high|critical",
  "delivery_method": "push|sms|email|voice_call"
}
```

### POST `/notifications/schedule-reminder`
**Purpose**: Set up payment and bill reminders
```json
{
  "reminder_type": "bill_due|payment_scheduled|budget_alert",
  "date_time": "2024-01-30T09:00:00Z",
  "message": "KPLC bill of KES 2,500 is due tomorrow",
  "repeat_pattern": "none|daily|weekly|monthly"
}
```

### POST `/receipts/generate`
**Purpose**: Create and deliver transaction receipts
```json
{
  "transaction_id": "uuid",
  "format": "pdf|sms|email|voice_readout",
  "delivery_method": "email|sms|download",
  "include_voice_summary": true
}
```

---

## System Administration

### POST `/system/log-action`
**Purpose**: Send comprehensive action logs to n8n orchestration
```json
{
  "action_type": "payment|scan|query|error|security_event",
  "payload": {...},
  "metadata": {
    "user_id": "uuid",
    "session_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "priority": "normal|high|critical"
}
```

### GET `/system/health`
**Purpose**: Verify system component availability and performance
```json
{
  "components": ["payment_gateways", "database", "ocr", "tts", "apis"],
  "include_latency": true
}
```

**Response**:
```json
{
  "status": "healthy|degraded|down",
  "components": {
    "mpesa_api": {
      "status": "healthy",
      "response_time": "250ms",
      "uptime": "99.9%"
    },
    "database": {
      "status": "healthy",
      "response_time": "15ms",
      "connections": "45/100"
    }
  },
  "overall_health_score": 98.5
}
```

### PUT `/users/{user_id}/preferences`
**Purpose**: Modify user settings and customization
```json
{
  "preference_category": "voice|security|payments|notifications",
  "settings": {
    "voice_speed": 1.2,
    "language": "en",
    "security_level": "high",
    "notification_methods": ["push", "sms"]
  },
  "apply_immediately": true
}
```

---

## Integration & Webhooks

### POST `/webhooks/register`
**Purpose**: Set up external webhook notifications
```json
{
  "event_type": "payment_completed|security_alert|balance_change",
  "endpoint_url": "https://your-app.com/webhook",
  "authentication": {
    "type": "hmac|bearer",
    "secret": "your_secret_key"
  },
  "retry_policy": {
    "max_retries": 3,
    "backoff": "exponential"
  }
}
```

### POST `/external/api-call`
**Purpose**: Make calls to external services
```json
{
  "api_endpoint": "https://api.external-service.com/endpoint",
  "method": "GET|POST|PUT|DELETE",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "payload": {...},
  "timeout": 30000
}
```

### POST `/workflows/trigger`
**Purpose**: Initiate n8n workflows programmatically
```json
{
  "workflow_id": "payment_approval_flow",
  "input_data": {
    "transaction_id": "uuid",
    "amount": 50000.00,
    "risk_score": 75
  },
  "context": {
    "user_session": "uuid",
    "transaction_history": [...],
    "risk_factors": [...]
  }
}
```

---

## Error Handling & Status Codes

### HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Error Response Format
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance in M-Pesa account",
    "details": {
      "available_balance": 500.00,
      "requested_amount": 1000.00,
      "shortfall": 500.00
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

---

## Rate Limiting & Quotas

### Rate Limits by Endpoint Type
- **Authentication**: 10 requests/minute
- **Payments**: 100 requests/hour
- **Balance Queries**: 1000 requests/hour
- **Voice Processing**: 500 requests/hour
- **OCR Scanning**: 200 requests/hour
- **General APIs**: 1000 requests/hour

### Premium Account Limits
- **Payments**: 1000 requests/hour
- **Voice Processing**: 2000 requests/hour
- **OCR Scanning**: 1000 requests/hour
- **General APIs**: 10000 requests/hour

---

## Testing & Development

### Sandbox Environment
**Base URL**: `https://sandbox-api.ongea-pesa.com/v1`
**Test Credentials**: Provided upon developer registration
**Mock Responses**: Available for all payment gateways

### Test Payment Methods
- **M-Pesa Sandbox**: Use test phone numbers `+254700000000` to `+254700000010`
- **Bank Cards**: Use test card `4111111111111111`
- **Crypto**: Testnet addresses provided

### Webhook Testing
Use `https://webhook.site` or similar services to test webhook deliveries during development.

---

This comprehensive API documentation covers all 65 functions of the Ongea Pesa system, providing developers with complete integration capabilities for voice-activated fintech operations, real-time payment processing, OCR document handling, and multi-currency wallet management.

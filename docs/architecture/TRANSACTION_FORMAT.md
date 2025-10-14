# Standard Transaction JSON Schema

## Universal Transaction Object

```json
{
  "type": "send_phone|buy_goods_pochi|buy_goods_till|paybill|withdraw|bank_to_mpesa|bank_to_bank",
  "amount": "2000",
  "phone": "254712345678",
  "till": "832909", 
  "paybill": "888880",
  "account": "1234567890",
  "agent": "123456",
  "store": "789",
  "bankCode": "01",
  "transaction_id": "uuid-v4-string",
  "timestamp": "2024-01-20T15:30:00Z",
  "user_id": "user-uuid",
  "voice_verified": true,
  "confidence": 95,
  "ready_to_process": true,
  "status": "pending|processing|completed|failed"
}
```

## Transaction Type Specific Examples

### 1. Send Money to Phone
```json
{
  "type": "send_phone",
  "amount": "2000",
  "phone": "254712345678"
}
```

### 2. Buy Goods - Pochi la Biashara
```json
{
  "type": "buy_goods_pochi",
  "amount": "1500",
  "phone": "254798765432"
}
```

### 3. Buy Goods - Till Number
```json
{
  "type": "buy_goods_till",
  "amount": "3200",
  "till": "832909"
}
```

### 4. Pay Bill (Paybill)
```json
{
  "type": "paybill",
  "amount": "2450",
  "paybill": "888880",
  "account": "1234567890"
}
```

### 5. Withdraw Cash
```json
{
  "type": "withdraw",
  "amount": "5000",
  "agent": "123456",
  "store": "789"
}
```

### 6. Bank to M-Pesa
```json
{
  "type": "bank_to_mpesa",
  "amount": "10000",
  "bankCode": "01",
  "account": "9876543210"
}
```

### 7. Bank to Bank Transfer
```json
{
  "type": "bank_to_bank",
  "amount": "25000",
  "bankCode": "03",
  "account": "1122334455"
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | **ALWAYS** | Transaction type identifier |
| `amount` | string | **ALWAYS** | Amount in KSh (no currency symbol) - MANDATORY for all transactions |
| `phone` | string | conditional | 254XXXXXXXXX format for send_phone, buy_goods_pochi |
| `till` | string | conditional | 6-7 digits for buy_goods_till |
| `paybill` | string | conditional | 6-7 digits for paybill transactions |
| `account` | string | conditional | Account/reference number for paybill, bank transactions |
| `agent` | string | conditional | 6-7 digits for withdraw transactions |
| `store` | string | conditional | Store number for withdraw transactions |
| `bankCode` | string | conditional | 2-4 digit bank code for bank transactions |

## Bank Codes Reference

| Code | Bank |
|------|------|
| 01 | KCB Bank |
| 02 | Standard Chartered |
| 03 | Barclays Bank |
| 04 | Equity Bank |
| 05 | Co-operative Bank |
| 06 | Family Bank |
| 07 | Postbank |
| 08 | Stanbic Bank |
| 09 | CfC Bank |
| 10 | NIC Bank |

## Validation Rules

### Phone Numbers
- Must start with 254 or 07/01
- Exactly 12 digits for 254 format
- Exactly 10 digits for 07/01 format
- Auto-convert 07/01 to 254 format

### Till/Paybill/Agent Numbers
- Exactly 6-7 digits
- No letters or special characters
- Leading zeros preserved

### Account Numbers
- Variable length (typically 8-13 digits)
- May contain letters and numbers
- Preserve exact formatting including spaces/dashes

### Amounts
- Numeric only (no KSh prefix in JSON)
- Minimum: 1 KSh
- Maximum: 999,999 KSh per transaction
- No decimal places (whole shillings only)

## N8N Workflow Integration

The JSON is sent to N8N webhook which:
1. Validates all required fields
2. Checks user balance/limits
3. Processes transaction via M-Pesa API
4. Returns success/failure response
5. Updates transaction status
6. Sends SMS confirmation

## Error Response Format

```json
{
  "success": false,
  "error_code": "INSUFFICIENT_FUNDS|INVALID_NUMBER|NETWORK_ERROR",
  "error_message": "Insufficient balance. Current balance: KSh 1,200",
  "transaction_id": "uuid-v4-string"
}
```

# M-Pesa Callback Integration Guide

## ✅ Implementation Status

### Callback Endpoint Created
- **URL:** `/api/gate/mpesa-callback`
- **Method:** `POST` (also supports `GET` for testing)
- **Authentication:** None required (external service calls it)

### Deposit Updated
- **File:** `app/api/gate/deposit/route.ts`
- **Callback URL:** Automatically added to deposit requests
- **Format:** `${YOUR_DOMAIN}/api/gate/mpesa-callback`

---

## 📞 How It Works

### 1. Deposit Flow with Callback

```bash
# When you initiate a deposit, the callback URL is included:
curl --location 'https://aps.co.ke/indexpay/api/gate_deposit.php' \
--form 'user_email="info@nsait.co.ke"' \
--form 'request="1"' \
--form 'transaction_intent="Deposit"' \
--form 'phone="0723214296"' \
--form 'amount="100"' \
--form 'currency="KES"' \
--form 'gate_name="your_gate_name"' \
--form 'pocket_name="ongeapesa_wallet"' \
--form 'payment_mode="MPESA"' \
--form 'callbackURL="https://yourdomain.com/api/gate/mpesa-callback"'
```

### 2. What Happens Next

1. **User receives M-Pesa prompt** on their phone
2. **User enters PIN** to complete payment
3. **IndexPay processes** the M-Pesa transaction
4. **IndexPay sends callback** to your URL with payment result
5. **Your endpoint processes** the callback:
   - Logs all details (headers, body, data)
   - Updates transaction status in database
   - Credits user's wallet if successful
   - Returns 200 OK to acknowledge receipt

---

## 📊 Callback Payload Examples

### Expected Callback Data (from IndexPay)

The callback endpoint logs everything it receives. Based on the curl example, here's what IndexPay likely sends:

```json
{
  "transaction_id": "ABC123XYZ",
  "external_reference": "ABC123XYZ",
  "status": "success",
  "Status": "Success",
  "amount": "100",
  "Amount": "100",
  "phone": "0723214296",
  "Phone": "254723214296",
  "mpesa_receipt": "QGH123456",
  "MpesaReceiptNumber": "QGH123456",
  "gate_name": "your_gate_name",
  "gate_id": "123",
  "message": "Transaction completed successfully",
  "Message": "Transaction completed successfully",
  "ResultCode": "0",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Success Callback
- `status` or `Status` = `"success"`
- `ResultCode` or `result_code` = `"0"`
- M-Pesa receipt number included
- Transaction updated to `completed`
- Wallet credited automatically

### Failed Callback
- `status` or `Status` = `"failed"`
- `ResultCode` or `result_code` ≠ `"0"`
- Error message included
- Transaction updated to `failed`
- Wallet NOT credited

---

## 🔍 What the Callback Displays

The callback endpoint logs EVERYTHING to the console:

```
================================================================================
🔔 M-PESA CALLBACK RECEIVED
================================================================================
⏰ Timestamp: 2024-01-01T12:00:00.000Z
📍 URL: https://yourdomain.com/api/gate/mpesa-callback

📋 HEADERS:
   content-type: application/json
   user-agent: IndexPay/1.0
   [... all other headers]

💰 CALLBACK PAYLOAD:
{
  "transaction_id": "ABC123XYZ",
  "status": "success",
  "amount": "100",
  "phone": "254723214296",
  "mpesa_receipt": "QGH123456",
  "gate_name": "your_gate_name"
  [... complete payload]
}

🔍 EXTRACTED FIELDS:
   Transaction ID: ABC123XYZ
   Status: success
   Amount: 100
   Phone: 254723214296
   M-Pesa Receipt: QGH123456
   Gate Name: your_gate_name
   Message: Transaction completed successfully
   Result Code: 0

✅ Success? true
❌ Failed? false

🔄 Updating transaction in database...
   Transaction ID: ABC123XYZ
✅ Found transaction: ABC123XYZ
   Current status: pending

💰 Wallet credited!
   Previous balance: KSh 1,000.00
   Deposit amount: KSh 100.00
   New balance: KSh 1,100.00

✅ Transaction updated successfully

⏱️ Processing time: 234 ms
================================================================================
```

---

## 🎯 Testing the Callback

### 1. Test Endpoint (GET)
```bash
curl https://yourdomain.com/api/gate/mpesa-callback

# Response:
{
  "message": "M-Pesa callback endpoint is active",
  "endpoint": "/api/gate/mpesa-callback",
  "method": "POST",
  "test_mode": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. Manual Test Callback (POST)
```bash
curl -X POST https://yourdomain.com/api/gate/mpesa-callback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "test123",
    "status": "success",
    "amount": "100",
    "phone": "254712345678",
    "mpesa_receipt": "TEST123456",
    "gate_name": "test_gate"
  }'

# Response:
{
  "success": true,
  "message": "Callback received and processed",
  "received_at": "2024-01-01T12:00:00Z",
  "duration_ms": 123,
  "transaction_id": "test123",
  "status_updated": "completed"
}
```

---

## 💰 Balance Endpoints

### Get Balance (DB + API)
```bash
# GET /api/gate/balance
curl https://yourdomain.com/api/gate/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "user_id": "abc-123",
  "user_email": "user@example.com",
  "wallet_balance": 1000.00,
  "wallet_balance_formatted": "KSh 1,000.00",
  "gate_id": "456",
  "gate_name": "user_gate",
  "gate_balance": 1000.00,
  "gate_balance_formatted": "KSh 1,000.00",
  "gate_balance_error": null,
  "balances_match": true,
  "difference": 0.00,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Sync Balance (Update DB from API)
```bash
# POST /api/gate/balance
curl -X POST https://yourdomain.com/api/gate/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "message": "Balance synced successfully",
  "previous_wallet_balance": 950.00,
  "new_wallet_balance": 1000.00,
  "gate_balance": 1000.00,
  "difference": -50.00,
  "synced_at": "2024-01-01T12:00:00Z"
}
```

---

## 🔧 Environment Variables Required

Add to your `.env.local`:

```bash
# Your application's public URL (for callback)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Or for local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 Key Features

### ✅ Callback Endpoint
- Receives ALL payment notifications from IndexPay
- Logs complete request (headers + body) for debugging
- Handles JSON, form-urlencoded, and multipart formats
- Updates database automatically
- Credits wallet on success
- Always returns 200 OK (prevents retry loops)

### ✅ Deposit with Callback
- Automatically includes callback URL
- Logs callback URL in console
- Transaction created with `pending` status
- Polling still works as backup

### ✅ Balance Retrieval
- `GET /api/gate/balance` - View balances from DB and API
- `POST /api/gate/balance` - Sync DB balance to match API
- Shows comparison and difference
- Formatted currency display

---

## 🚨 Important Notes

1. **Callback URL must be publicly accessible**
   - IndexPay needs to reach your server
   - Use HTTPS in production
   - For local testing, use ngrok or similar tunnel

2. **No authentication on callback endpoint**
   - IndexPay is external service
   - Endpoint must be open
   - Add signature verification if IndexPay provides it

3. **Polling still available**
   - Callback is primary method
   - Polling works as backup
   - Both can run simultaneously

4. **Always returns 200 OK**
   - Even on errors
   - Prevents IndexPay from retrying
   - Errors logged internally

---

## 📖 See Also

- `app/api/gate/mpesa-callback/route.ts` - Callback implementation
- `app/api/gate/deposit/route.ts` - Deposit with callback URL
- `app/api/gate/balance/route.ts` - Balance retrieval
- API collection: `api_indx.postman_collection.json`

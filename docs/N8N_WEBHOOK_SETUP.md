# n8n Webhook Setup for Voice Transactions

## Current Status

✅ **Voice webhook authentication** - WORKING
✅ **User identification** - WORKING  
✅ **Balance validation** - WORKING
✅ **Payload preparation** - WORKING
❌ **n8n webhook endpoint** - NEEDS ACTIVATION

## The Problem

The webhook is sending data to n8n successfully, but getting a 404 error:

```json
{
  "code": 404,
  "message": "The requested webhook 'POST 44c0ce1d-defb-4003-b02c-a86974ca5446' is not registered.",
  "hint": "The workflow must be active for a production URL to run successfully"
}
```

## Updated n8n Webhook URL

**New URL (as of this fix):**
```
https://primary-production-579c.up.railway.app/webhook/send_money
```

**Previous URL (404 error):**
```
https://primary-production-579c.up.railway.app/webhook/44c0ce1d-defb-4003-b02c-a86974ca5446
```

## Payload Being Sent to n8n

The webhook sends a complete payload with all user context:

```json
{
  "summary": "Send 20000 to 0743854888",
  "phone": "0743854888",
  "amount": "20000",
  "user_id": "b970bef4-4852-4bce-b424-90a64e2d922f",
  "user_email": "ijepale@gmail.com",
  "user_phone": "254712345678",
  "user_name": "ijepale",
  "original_request": "I want you to send 20000 to 0743854888",
  "conversation_id": null,
  "timestamp": "2025-11-15T21:36:45.954Z",
  "platform": "ongea_pesa_voice",
  "platform_fee": 100,
  "is_free_transaction": false,
  "current_balance": 92500
}
```

## What n8n Workflow Should Do

### 1. Receive POST Request
- Endpoint: `/webhook/send_money`
- Method: `POST`
- Content-Type: `application/json`

### 2. Process Transaction
Based on the payload:
- Extract `amount`, `phone`, `user_id`, `user_email`
- Process M-Pesa payment
- Deduct from user wallet balance
- Log transaction in database

### 3. Return Response
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "transaction_id": "TXN_123456"
}
```

Or on error:
```json
{
  "success": false,
  "message": "Transaction failed: [reason]",
  "error": "error_code"
}
```

## n8n Workflow Setup Steps

### 1. Activate Workflow
In n8n dashboard:
1. Open your workflow
2. Click the **toggle switch** in top-right to activate
3. Verify production webhook URL is enabled

### 2. Configure Webhook Node
```yaml
Method: POST
Path: /webhook/send_money
Authentication: None (handled by Vercel)
Response: 
  - Mode: Last Node
  - Status Code: 200
```

### 3. Test the Webhook
After activation, test with curl:

```bash
curl -X POST https://primary-production-579c.up.railway.app/webhook/send_money \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test transaction",
    "phone": "254712345678",
    "amount": "100",
    "user_id": "test-user-id",
    "user_email": "test@example.com",
    "user_phone": "254712345678",
    "user_name": "Test User",
    "platform_fee": 0.5,
    "is_free_transaction": false,
    "current_balance": 10000
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "transaction_id": "TXN_..."
}
```

## Environment Variable (Optional)

You can override the webhook URL by setting this in Vercel:

```env
N8N_WEBHOOK_URL=https://primary-production-579c.up.railway.app/webhook/send_money
```

**To set in Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `N8N_WEBHOOK_URL` with your n8n webhook URL
4. Redeploy

## Troubleshooting

### Issue: Still Getting 404
**Solutions:**
1. Verify workflow is **ACTIVE** in n8n (toggle on)
2. Check webhook path exactly matches: `/webhook/send_money`
3. Ensure workflow is saved after changes
4. Check n8n logs for errors

### Issue: Webhook Times Out
**Solutions:**
1. Check n8n workflow isn't stuck in infinite loop
2. Verify all workflow nodes complete successfully
3. Add timeout handling in n8n (max 60 seconds)
4. Return response immediately, process async if needed

### Issue: Wrong Data Received
**Solutions:**
1. Check payload structure in n8n webhook node
2. Log received data: `{{ $json }}`
3. Verify field names match exactly (case-sensitive)

## Success Metrics

When working correctly, you should see:

✅ Vercel logs: `n8n Response Status: 200`
✅ n8n logs: Webhook execution successful
✅ Transaction recorded in database
✅ User balance updated
✅ ElevenLabs receives success response

## Next Steps

1. **Activate n8n workflow** at Railway
2. **Test with curl** to verify webhook responds
3. **Test voice transaction** from app
4. **Monitor logs** in both Vercel and n8n
5. **Verify database** updates correctly

## Support

If webhook continues to fail:
1. Check n8n Railway deployment status
2. Verify Railway app is running (not sleeping)
3. Check Railway logs for errors
4. Test webhook directly (bypass voice interface)
5. Contact Railway support if needed

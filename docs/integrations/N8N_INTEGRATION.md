# n8n Integration: Accessing userId in Workflows

## Overview
The Ongea Pesa application now properly sends the `userId` to all n8n webhooks through the ElevenLabs conversation flow.

## How userId is Transmitted

### 1. **Signed URL Query Parameters**
When the voice conversation starts, the userId is appended to the ElevenLabs signed URL:
```
wss://api.elevenlabs.io/v1/convai/...?user_id={userId}&user_name={userName}
```

### 2. **Available in n8n Webhooks**
When ElevenLabs calls your n8n webhook, the userId is accessible through:

#### Method A: Query Parameters (Recommended)
```javascript
// In n8n webhook node, access via:
$input.params.query.user_id
$input.params.query.user_name
```

#### Method B: Request Body
If ElevenLabs forwards the parameters in the request body:
```javascript
// Access via:
$json.user_id
$json.user_name
```

#### Method C: Custom Headers (if configured)
```javascript
// Access via:
$node["Webhook"].json.headers["x-user-id"]
```

## Implementation Details

### Frontend Flow
1. **UserContext** (`contexts/UserContext.tsx`)
   - Manages authenticated user state
   - Retrieves userId from Supabase auth or creates guest user
   - Stores userId in localStorage for persistence

2. **API Endpoint** (`app/api/get-signed-url/route.ts`)
   - Accepts userId via POST request body
   - Validates userId is present
   - Logs userId for debugging
   - Returns signed URL with userId

3. **Voice Interface** (`components/ongea-pesa/voice-interface.tsx`)
   - Retrieves userId from UserContext
   - Sends userId to API endpoint
   - Appends userId to signed URL as query parameter
   - Starts conversation with userId-enhanced URL

### Data Flow Diagram
```
User Login/Guest
    ↓
UserContext (stores userId)
    ↓
VoiceInterface (reads userId)
    ↓
POST /api/get-signed-url (validates userId)
    ↓
ElevenLabs Signed URL + ?user_id={userId}
    ↓
n8n Webhook (receives userId in query params)
    ↓
Backend Operations (send_money, etc.)
```

## n8n Workflow Examples

### Example 1: Send Money Transaction
```javascript
// In n8n "Function" node before database operation
const userId = $json.user_id || $input.params.query.user_id;
const amount = $json.amount;
const phone = $json.phone;

// Insert transaction with correct userId
return {
  user_id: userId,
  type: 'send_phone',
  amount: amount,
  phone: phone,
  status: 'pending',
  created_at: new Date().toISOString()
};
```

### Example 2: Get User Transaction History
```javascript
// In n8n "Supabase" node query
const userId = $json.user_id || $input.params.query.user_id;

// Query filter
{
  "user_id": userId,
  "created_at": {
    "gte": "{{ $today() }}"
  }
}
```

### Example 3: Check User Limits
```javascript
// In n8n "Code" node
const userId = $json.user_id || $input.params.query.user_id;

// Fetch user limits
const limits = await supabase
  .from('transaction_limits')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);

return limits;
```

## Debugging

### Console Logs to Check
In the browser console, you'll see:
```
🔑 Requesting signed URL with userId: guest_1234567890_abc123
✅ Signed URL received for userId: guest_1234567890_abc123
🎙️ Starting conversation with signed URL for userId: guest_1234567890_abc123
📡 URL includes userId parameter for n8n workflows
```

### n8n Webhook Debugging
Add a "Set" node at the start of your workflow:
```javascript
// Extract and verify userId
{
  "received_user_id": "{{ $json.user_id || $input.params.query.user_id }}",
  "received_user_name": "{{ $json.user_name || $input.params.query.user_name }}",
  "full_query": "{{ $input.params.query }}",
  "full_body": "{{ $json }}"
}
```

## User ID Types

### 1. Authenticated User ID
- Format: Supabase UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Source: Supabase authentication
- Persistent across sessions

### 2. Guest User ID
- Format: `guest_{timestamp}_{random}` (e.g., `guest_1697188800_abc123def`)
- Source: Created on first use
- Stored in localStorage
- Used when user is not authenticated

## Best Practices

1. **Always validate userId exists**
   ```javascript
   const userId = $json.user_id || $input.params.query.user_id;
   if (!userId) {
     throw new Error('userId is required for this operation');
   }
   ```

2. **Log userId for debugging**
   ```javascript
   console.log('Processing transaction for userId:', userId);
   ```

3. **Handle both user types**
   ```javascript
   const isGuestUser = userId.startsWith('guest_');
   if (isGuestUser) {
     // Apply guest user limits
   }
   ```

4. **Store userId with all transactions**
   ```javascript
   // Always include in database inserts
   {
     user_id: userId,
     // ... other fields
   }
   ```

## Testing

### Test 1: Verify userId in Console
1. Open browser DevTools
2. Navigate to voice interface
3. Check console for userId logs
4. Confirm userId is consistent across calls

### Test 2: Verify userId in n8n
1. Trigger a voice transaction
2. Check n8n execution logs
3. Verify userId appears in webhook data
4. Confirm it matches console logs

### Test 3: Database Verification
1. Execute a transaction via voice
2. Query transactions table
3. Verify `user_id` column is populated
4. Confirm it's not null or reused

## Troubleshooting

### Issue: userId is null in n8n
**Solution**: Check if userId is being passed in query params:
```javascript
// Try both locations
const userId = $input.params?.query?.user_id || $json?.user_id;
```

### Issue: Same userId for all users
**Solution**: Clear localStorage and refresh:
```javascript
localStorage.removeItem('ongea_pesa_user_id');
localStorage.removeItem('ongea_pesa_user');
```

### Issue: Guest users creating multiple IDs
**Solution**: UserContext checks localStorage first before creating new guest ID

## Migration Notes

If you have existing n8n workflows:
1. Update webhook handlers to extract userId from query params
2. Update database operations to use the extracted userId
3. Test with both guest and authenticated users
4. Add logging to verify userId is received correctly

## Support

For issues with userId integration:
1. Check browser console logs for userId values
2. Verify n8n webhook is receiving query parameters
3. Check ElevenLabs agent configuration
4. Ensure UserProvider is wrapping the app component

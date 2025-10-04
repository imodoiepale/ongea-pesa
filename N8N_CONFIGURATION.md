# n8n Workflow Configuration for Ongea Pesa

## 🔗 Webhook Configuration

### Webhook URL
```
https://primary-production-579c.up.railway.app/webhook-test/send_money
```

### Expected Payload Format

Your Next.js API now sends data in this format:

```json
{
  "query": {
    "request": "Send 1000 to 0712345678"
  },
  "body": {
    "user_id": "15f7bee0-76b8-478c-87ff-dc9212b1464e",
    "user_email": "user@example.com",
    "user_phone": "254712345678",
    "user_name": "John Doe",
    "type": "send_phone",
    "amount": 1000,
    "phone": "254712345678",
    "till": "",
    "paybill": "",
    "account": "",
    "agent": "",
    "store": "",
    "bank_code": "",
    "summary": "Send money to phone",
    "voice_verified": true,
    "confidence_score": 85,
    "voice_command_text": "Send 1000 to 0712345678",
    "status": "pending",
    "mpesa_transaction_id": "",
    "external_ref": "",
    "timestamp": "2024-10-04T14:00:00.000Z",
    "source": "elevenlabs"
  }
}
```

---

## 📊 n8n Access Patterns

Your AI Agent prompt accesses data like this:

```javascript
// Access user's voice command
{{ $json.query.request }}

// Access transaction type
{{ $json.body.type }}

// Access amount
{{ $json.body.amount }}

// Access phone number
{{ $json.body.phone }}

// Access user ID
{{ $json.body.user_id }}
```

---

## 🔧 Update Your n8n "Edit Fields" Node

The "Edit Fields" node should map like this:

```javascript
// User ID - use from body
user_id: {{ $json.body.user_id || "15f7bee0-76b8-478c-87ff-dc9212b1464e" }}

// Type - from AI output or body
type: {{ $json.output.type || $json.body.type }}

// Amount - from AI output or body
amount: {{ $json.output.amount || $json.body.amount }}

// Phone - from AI output or body
phone: {{ $json.output.phone || $json.body.phone }}

// All other fields similarly...
```

---

## 💰 Add Balance Update Step

After "Create a row" node, add a new **HTTP Request** node to update user balance:

### Node: "Update User Balance"

**Configuration:**
- **Method**: POST
- **URL**: `https://YOUR_SUPABASE_URL/rest/v1/rpc/update_user_balance`
- **Authentication**: Bearer Token
- **Headers**:
  ```
  Authorization: Bearer YOUR_SUPABASE_SERVICE_KEY
  apikey: YOUR_SUPABASE_SERVICE_KEY
  Content-Type: application/json
  ```

**Body (JSON)**:
```json
{
  "p_user_id": "{{ $json.user_id }}",
  "p_amount": "{{ $json.amount }}",
  "p_transaction_type": "{{ $json.type }}"
}
```

---

## 🗄️ Create Supabase Function

You need to create this PostgreSQL function in your Supabase SQL editor:

```sql
-- Function to update user balance after transaction
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_transaction_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_amount_change NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, create one with default balance
  IF v_current_balance IS NULL THEN
    INSERT INTO profiles (id, balance, created_at, updated_at)
    VALUES (p_user_id, 10000, NOW(), NOW())
    RETURNING balance INTO v_current_balance;
  END IF;
  
  -- Calculate balance change based on transaction type
  CASE p_transaction_type
    -- Deduct for outgoing transactions
    WHEN 'send_phone' THEN
      v_amount_change := -p_amount;
    WHEN 'buy_goods_pochi' THEN
      v_amount_change := -p_amount;
    WHEN 'buy_goods_till' THEN
      v_amount_change := -p_amount;
    WHEN 'paybill' THEN
      v_amount_change := -p_amount;
    WHEN 'withdraw' THEN
      v_amount_change := -p_amount;
    WHEN 'mpesa_to_bank' THEN
      v_amount_change := -p_amount;
    -- Add for incoming transactions
    WHEN 'bank_to_mpesa' THEN
      v_amount_change := p_amount;
    -- Default: deduct
    ELSE
      v_amount_change := -p_amount;
  END CASE;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + v_amount_change;
  
  -- Check if sufficient balance for deductions
  IF v_new_balance < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;
  
  -- Update balance
  UPDATE profiles
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount_changed', v_amount_change,
    'transaction_type', p_transaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 Add Balance Column to Profiles Table

If you don't have a balance column yet:

```sql
-- Add balance column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance NUMERIC(15,2) DEFAULT 10000.00;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

-- Update existing users with default balance
UPDATE profiles 
SET balance = 10000.00 
WHERE balance IS NULL;
```

---

## 🔄 Updated n8n Workflow Steps

Your workflow should look like this:

```
1. Webhook Trigger
   ↓
2. AI Agent (extracts transaction data)
   ↓
3. Edit Fields (formats for Supabase)
   ↓
4. Create a row (saves transaction to transactions table)
   ↓
5. HTTP Request: Update User Balance (calls Supabase function) ← ADD THIS
   ↓
6. Respond to Webhook (sends success back to Next.js)
```

---

## 🔧 HTTP Request Node Configuration

### Step-by-Step:

1. **Add HTTP Request node** after "Create a row"
2. **Name it**: "Update User Balance"
3. **Set Method**: POST
4. **Set URL**: 
   ```
   https://YOUR_PROJECT.supabase.co/rest/v1/rpc/update_user_balance
   ```
5. **Add Headers**:
   - `Authorization`: `Bearer YOUR_SERVICE_KEY`
   - `apikey`: `YOUR_SERVICE_KEY`
   - `Content-Type`: `application/json`
6. **Set Body**:
   ```json
   {
     "p_user_id": "={{ $('Create a row').item.json.user_id }}",
     "p_amount": "={{ $('Create a row').item.json.amount }}",
     "p_transaction_type": "={{ $('Create a row').item.json.type }}"
   }
   ```

---

## ✅ Testing

### Test Payload

Send this to your webhook to test:

```bash
curl -X POST https://primary-production-579c.up.railway.app/webhook-test/send_money \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "request": "Send 500 to 0712345678"
    },
    "body": {
      "user_id": "15f7bee0-76b8-478c-87ff-dc9212b1464e",
      "type": "send_phone",
      "amount": 500,
      "phone": "254712345678",
      "voice_verified": true,
      "confidence_score": 85,
      "voice_command_text": "Send 500 to 0712345678",
      "status": "pending"
    }
  }'
```

### Expected Result:

1. ✅ Transaction saved to `transactions` table
2. ✅ User balance updated in `profiles` table
3. ✅ Success response returned

---

## 📊 Check Balance

Query to check user balance:

```sql
SELECT 
  id,
  email,
  full_name,
  balance,
  updated_at
FROM profiles
WHERE id = '15f7bee0-76b8-478c-87ff-dc9212b1464e';
```

---

## 🔍 View Recent Transactions

```sql
SELECT 
  t.id,
  t.type,
  t.amount,
  t.phone,
  t.status,
  t.created_at,
  p.email as user_email,
  p.balance as current_balance
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.user_id = '15f7bee0-76b8-478c-87ff-dc9212b1464e'
ORDER BY t.created_at DESC
LIMIT 10;
```

---

## 🎯 Summary

Your complete flow:

1. **ElevenLabs** → calls `send_money` tool
2. **Next.js API** → receives data, adds user context
3. **n8n Webhook** → receives formatted data at `/webhook-test/send_money`
4. **AI Agent** → processes and extracts transaction details
5. **Supabase Insert** → saves transaction
6. **Balance Update** → calls `update_user_balance` function
7. **Response** → returns success to ElevenLabs

**User sees**: Transaction completed, balance updated! 🎉

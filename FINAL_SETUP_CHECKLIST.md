# ✅ Final Setup Checklist - Ongea Pesa Voice Payments

## 🎯 Complete Setup in 4 Steps

---

## ✅ STEP 1: Setup Supabase Database (5 minutes)

### 1.1 Run SQL Setup
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click **SQL Editor**
3. Create new query
4. Copy ALL contents from `supabase-setup.sql`
5. Click **Run**
6. Should see: "Success. No rows returned"

### 1.2 Verify Tables Created
Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'transactions');
```

Should return: `profiles`, `transactions`

### 1.3 Check Balance Column
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'balance';
```

Should return: `balance | numeric`

---

## ✅ STEP 2: Configure n8n Workflow (10 minutes)

### 2.1 Your n8n Webhook is Already Set Up
- ✅ URL: `https://primary-production-579c.up.railway.app/webhook-test/send_money`
- ✅ Method: POST
- ✅ Authentication: Header Auth

### 2.2 Add "Update User Balance" Node

**After your "Create a row" node, add HTTP Request:**

1. Click **+** → **HTTP Request**
2. **Name**: "Update User Balance"
3. **Method**: POST
4. **URL**: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/update_user_balance`
   *(Replace YOUR_PROJECT with your actual Supabase project ID)*

5. **Authentication**: None (using headers)

6. **Headers** (click "Add Parameter" for each):
   ```
   Name: Authorization
   Value: Bearer YOUR_SUPABASE_SERVICE_KEY
   
   Name: apikey
   Value: YOUR_SUPABASE_SERVICE_KEY
   
   Name: Content-Type
   Value: application/json
   ```

7. **Body** (select "JSON"):
   ```json
   {
     "p_user_id": "={{ $('Create a row').item.json.user_id }}",
     "p_amount": "={{ $('Create a row').item.json.amount }}",
     "p_transaction_type": "={{ $('Create a row').item.json.type }}"
   }
   ```

8. **Connect** "Create a row" → "Update User Balance" → "Respond to Webhook"

### 2.3 Get Your Supabase Service Key
1. Go to Supabase Dashboard → Settings → API
2. Copy **service_role** key (starts with `eyJ...`)
3. Paste in n8n headers above

---

## ✅ STEP 3: Setup Local Testing (DONE ✅)

### 3.1 Verify Running Services
Check these are running:

**Terminal 1 - ngrok:**
```bash
ngrok http 3000
```
Status: ✅ Running at `https://d3c0ff66f0f3.ngrok-free.app`

**Terminal 2 - Next.js:**
```bash
npm run dev
```
Status: Should show `✓ Ready on http://localhost:3000`

### 3.2 Your Setup Status
- ✅ Next.js API updated to send correct format to n8n
- ✅ n8n webhook URL: `https://primary-production-579c.up.railway.app/webhook-test/send_money`
- ✅ Payload format matches your n8n AI Agent expectations
- ✅ Extensive logging added for debugging

---

## ✅ STEP 4: Configure ElevenLabs Agent (5 minutes)

### 4.1 Update Webhook URL
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Find your Ongea Pesa agent → **Edit**
3. Go to **Tools** tab
4. Find `send_money` webhook tool
5. Update URL to:
   ```
   https://d3c0ff66f0f3.ngrok-free.app/api/voice/webhook
   ```
   *(Your current ngrok URL)*

6. **Important**: Add your email as query parameter for user lookup:
   ```
   https://d3c0ff66f0f3.ngrok-free.app/api/voice/webhook?user_email=ijepale@gmail.com
   ```
   *(Replace with your actual Supabase login email)*

7. Click **Save**

### 4.2 Verify Tool Configuration
Make sure your `send_money` tool has these parameters:

**Query Params:**
- ✅ `request` (string, required)
- ✅ `user_email` (string, optional) ← ADD THIS

**Body:**
- ✅ `type` (string, enum, required)
- ✅ `amount` (string, required)
- ✅ `phone` (string, optional)
- ✅ `till` (string, optional)
- ✅ `paybill` (string, optional)
- ✅ `account` (string, optional)
- ✅ `agent` (string, optional)
- ✅ `store` (string, optional)
- ✅ `bankCode` (string, optional)
- ✅ `summary` (string, required)

---

## 🧪 STEP 5: Test End-to-End!

### Test 1: Simple Send Money

**Speak to your agent:**
```
"Send 100 shillings to 0712345678"
```

**Expected Flow:**
1. ✅ ElevenLabs processes voice
2. ✅ Calls your ngrok webhook
3. ✅ Next.js logs show incoming request
4. ✅ User looked up from Supabase
5. ✅ Data forwarded to n8n
6. ✅ n8n AI Agent extracts transaction details
7. ✅ Transaction saved to `transactions` table
8. ✅ Balance updated in `profiles` table
9. ✅ Agent responds: "Sent!"

**Check Logs:**

**Next.js Terminal:**
```
=== VOICE WEBHOOK CALLED ===
Request Body: { "type": "send_phone", "amount": "100", ... }
🔍 Looking up user by email: ijepale@gmail.com
✅ Found user: ijepale@gmail.com
✅ User context: { id: "...", email: "..." }
=== FORWARDING TO N8N ===
✅ n8n Response: { ... }
=== WEBHOOK COMPLETED ===
```

**ngrok Dashboard (http://127.0.0.1:4040):**
- Should see POST request from ElevenLabs
- Status: 200 OK

**n8n Workflow:**
- Click on workflow execution
- Should see green checkmarks on all nodes
- Check "Update User Balance" response

**Supabase:**
```sql
-- Check transaction was saved
SELECT * FROM transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 1;

-- Check balance was updated
SELECT email, balance, updated_at 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
```

### Test 2: Check Your Balance

**In Supabase SQL Editor:**
```sql
SELECT 
  email,
  full_name,
  balance,
  updated_at
FROM profiles
WHERE email = 'ijepale@gmail.com';
```

**Expected:**
- Initial balance: `10000.00`
- After test: `9900.00` (10000 - 100)

### Test 3: View Transaction History

```sql
SELECT 
  type,
  amount,
  phone,
  status,
  voice_command_text,
  created_at
FROM transactions
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'ijepale@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎉 Success Indicators

### ✅ All Systems Working When:

1. **Next.js Logs Show:**
   - ✅ Webhook called
   - ✅ User authenticated/found
   - ✅ Data forwarded to n8n
   - ✅ n8n responded successfully

2. **ngrok Dashboard Shows:**
   - ✅ POST requests from ElevenLabs
   - ✅ 200 OK responses

3. **n8n Shows:**
   - ✅ Workflow executed successfully
   - ✅ All nodes green
   - ✅ Transaction data in outputs

4. **Supabase Shows:**
   - ✅ New row in `transactions` table
   - ✅ Balance updated in `profiles` table
   - ✅ `updated_at` timestamp changed

5. **ElevenLabs Agent:**
   - ✅ Responds with confirmation
   - ✅ Says "Sent!" or similar

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized" in ngrok
**Fix:** Add `?user_email=YOUR_EMAIL` to ElevenLabs webhook URL

### Issue: "n8n webhook failed"
**Check:** 
- Is n8n workflow active?
- Is webhook URL correct?
- Check n8n execution logs

### Issue: "Balance not updating"
**Check:**
- Did you run `supabase-setup.sql`?
- Is "Update User Balance" node configured?
- Check Supabase function exists: `SELECT * FROM pg_proc WHERE proname = 'update_user_balance';`

### Issue: "Transaction not saved"
**Check:**
- Does `transactions` table exist?
- Check n8n "Create a row" node configuration
- Verify Supabase credentials in n8n

### Issue: "User not found"
**Check:**
- Is the email in query param correct?
- Does user exist in Supabase: `SELECT * FROM profiles WHERE email = 'YOUR_EMAIL';`
- Did you sign up at `localhost:3000`?

---

## 📊 Monitoring Commands

### Check Latest Transaction:
```sql
SELECT 
  t.*,
  p.email,
  p.balance
FROM transactions t
JOIN profiles p ON t.user_id = p.id
ORDER BY t.created_at DESC
LIMIT 1;
```

### Check User Balance History:
```sql
SELECT 
  email,
  balance,
  updated_at
FROM profiles
WHERE email = 'ijepale@gmail.com';
```

### Check n8n Logs:
- Open n8n workflow
- Click "Executions" tab
- View latest execution
- Check each node's output

### Check Next.js Logs:
- View terminal where `npm run dev` is running
- Look for "=== VOICE WEBHOOK CALLED ==="

### Check ngrok Logs:
- Visit http://127.0.0.1:4040
- See all incoming requests
- Inspect payloads

---

## 🚀 Ready for Production?

### When deploying to Vercel:

1. **Update ElevenLabs webhook to:**
   ```
   https://ongeapesa.vercel.app/api/voice/webhook?user_email=USER_EMAIL
   ```

2. **Set Vercel environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

3. **n8n stays the same:**
   - Same Railway webhook URL
   - Same Supabase configuration

---

## 🎯 You're All Set!

Your complete voice-activated payment system:
- ✅ Voice interface with ElevenLabs
- ✅ Authentication with Supabase
- ✅ Transaction processing with n8n
- ✅ AI-powered data extraction
- ✅ Automatic balance updates
- ✅ Full transaction history
- ✅ Real-time logging

**Test it now with:** "Send 100 to 0712345678" 🎤💰

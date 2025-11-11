# ✅ ElevenLabs Prompt Rewrite - Complete Summary

## 🎯 What Changed

Your ElevenLabs prompt (`prompt.md`) has been **completely rewritten** to accurately reflect your **internal wallet system** with all features properly documented.

---

## 🆕 New Features Added to Prompt

### 1. **Internal Wallet System** ✅
- **Before**: Prompt said "M-Pesa assistant" (confusing!)
- **After**: "Wallet assistant" - crystal clear it's NOT M-Pesa

**Key Changes:**
```markdown
## 💰 How Ongea Pesa Works

**IMPORTANT: We use an internal wallet system, NOT your M-Pesa directly!**

### Your Wallet Balance
- Every user has a wallet balance in Ongea Pesa
- Load money from M-Pesa into your wallet
- Send to other Ongea Pesa users instantly (wallet-to-wallet)
- Pay M-Pesa services from your wallet
- Withdraw back to M-Pesa anytime
```

---

### 2. **Transaction Types: Internal vs External** ✅

**Internal Wallet Transfers** (Instant, 0.5% fee or FREE):
- **`c2c`** - Customer to Customer (send to friends/family on Ongea Pesa)
- **`c2b`** - Customer to Business (pay businesses on Ongea Pesa)
- **`b2c`** - Business to Customer
- **`b2b`** - Business to Business

**External M-Pesa Transactions** (from wallet to M-Pesa network):
- `send_phone` - Send to M-Pesa phone number
- `buy_goods_pochi` - M-Pesa Pochi payment
- `buy_goods_till` - M-Pesa Till payment
- `paybill` - M-Pesa Paybill payment
- `withdraw` - Withdraw to M-Pesa
- `bank_to_mpesa` - Bank to M-Pesa
- `bank_to_bank` - Bank transfer

---

### 3. **Subscription System** ✅

```markdown
### 🎁 Subscription Benefits
- KES 5,000/month subscription = 20 FREE sends per month
- Free transactions: amounts ≥ KES 1,000
- Non-subscribers: 0.5% fee on all internal sends
- Counter resets monthly
```

**AI now mentions:**
- "That was free! You have 19 free sends left this month."
- "Subscribe for KES 5,000/month to get 20 free sends!"
- "You've used all 20 free sends. This one costs 0.5%."

---

### 4. **Updated Tool Parameters** ✅

**Before:**
```json
{
  "type": "send_phone | buy_goods_till | paybill | ...",
  "phone": "254712345678",
  ...
}
```

**After:**
```json
{
  "type": "c2c | c2b | b2c | b2b | send_phone | buy_goods_till | paybill | ...",
  "recipient": "john@gmail.com OR 0712345678 OR user_name",
  "phone": "254712345678",
  ...
}
```

**Key distinction:**
- **`recipient`**: For INTERNAL transfers (c2c, c2b, etc.) - can be name, email, or phone
- **`phone`**: For EXTERNAL M-Pesa transactions only

---

### 5. **Wallet-Specific Language** ✅

**Always says:**
- ✅ "from your wallet" (when sending)
- ✅ "to their wallet" (for internal transfers)
- ✅ "from your wallet to M-Pesa" (for external)
- ✅ "Your wallet balance is..."

**Never says:**
- ❌ "from your M-Pesa" (WRONG - it's from wallet)
- ❌ "to their M-Pesa" (unless actually external)

---

### 6. **Updated Execution Scenarios** ✅

#### Scenario 1: Internal Transfer (FREE - Subscribed)
```
User: "Send 5000 to John"
AI: "Okay, sending KSh 5,000 to John from your wallet…" 
[type: c2c, recipient: John]
AI: "Done! Pesa imefika John's wallet. That was free! You have 19 free sends left."
```

#### Scenario 2: Internal Transfer (0.5% Fee)
```
User: "Tuma 3000 to mama"
AI: "Alright, sending KSh 3,000 to mama from your wallet…"
[type: c2c, recipient: mama]
AI: "Sent! Transaction cost KSh 15 (0.5% fee). Your wallet balance is KSh 6,985."
```

#### Scenario 3: External M-Pesa
```
User: "Pay till 832909, 500 bob"
AI: "Paying KSh 500 from your wallet to till 832909…"
[type: buy_goods_till]
AI: "Done! Paid to till 832909 from your wallet."
```

#### Scenario 4: Insufficient Balance
```
User: "Send 10000 to John"
AI: "Sorry boss, you don't have enough in your wallet. You have KSh 5,000 but need KSh 10,000. Want to load from M-Pesa first?"
```

---

### 7. **Subscription-Aware Responses** ✅

```markdown
### Subscription-Aware Responses
- Free transaction: "That was free! You have {X} free sends left."
- Free tx used up: "You've used all 20 free sends. This one costs 0.5%."
- Non-subscriber: "Subscribe for KES 5,000/month to get 20 free sends!"
- Amount too small: "Small amounts under KES 1,000 have a 0.5% fee."
```

---

### 8. **Enhanced Error Handling** ✅

**New wallet-specific errors:**
- **Insufficient wallet balance**: "Sorry boss, you don't have enough in your wallet..."
- **Recipient not found**: "Hmm, I can't find that person on Ongea Pesa..."
- **Self-transfer**: "You can't send money to yourself, boss!"
- **Amount too large**: "Maximum is KSh 999,999 per transaction."

---

### 9. **New Emergency Commands** ✅

- **Balance**: "What's my balance?" → Tell current wallet balance
- **Subscription**: "Tell me about subscription" → Explain KES 5,000/month benefits
- **Load**: "How do I add money?" → Explain M-Pesa to wallet loading

---

### 10. **Updated Core Philosophy** ✅

**Before:**
> "You are Ongea Pesa, Kenya's fastest M-Pesa assistant"

**After:**
> "You are Ongea Pesa — not a bot, not a form. Not M-Pesa, but your own WALLET system."

**Key messaging:**
- Wallet-first: Always clarify wallet vs M-Pesa
- Subscription-aware: Celebrate free transactions
- No confusion: Never mix up wallet with M-Pesa

---

## 📊 Feature Checklist

### ✅ All Features Included

- [x] **Internal wallet system** clearly explained
- [x] **C2C, C2B, B2C, B2B** transaction types
- [x] **Subscription system** (KES 5,000/month)
- [x] **20 free transactions/month** for subscribers
- [x] **0.5% platform fee** for non-free transactions
- [x] **Free transaction eligibility** (amounts ≥ KES 1,000)
- [x] **Wallet balance tracking**
- [x] **External M-Pesa payments** (till, paybill, withdraw)
- [x] **Load from M-Pesa** to wallet
- [x] **Withdraw to M-Pesa** from wallet
- [x] **Friend-of-friend transfers** (via recipient identifier)
- [x] **Database integration** (process_internal_transfer function)
- [x] **Subscription-aware responses**
- [x] **Wallet vs M-Pesa clarity**

---

## 🎯 How to Use This Prompt

### 1. **Copy to ElevenLabs**
- Open your ElevenLabs Agent settings
- Go to "System Prompt" section
- Paste the entire `prompt.md` content

### 2. **Configure send_money Tool**
Make sure your tool points to:
```
POST https://yourdomain.com/api/voice/webhook
```

### 3. **Test Scenarios**

**Test Internal Transfer:**
```
You: "Send 5000 to John"
Expected: Uses type: c2c, mentions wallet, shows free tx status
```

**Test External M-Pesa:**
```
You: "Pay till 832909, 500 bob"
Expected: Uses type: buy_goods_till, mentions "from your wallet"
```

**Test Subscription:**
```
You: "Tell me about subscription"
Expected: Explains KES 5,000/month = 20 free sends
```

---

## 🔧 Technical Details

### Database Integration

The prompt references these database features:

1. **`process_internal_transfer()` function**
   - Handles C2C, C2B, B2C, B2B transfers
   - Deducts from sender, credits recipient
   - Records platform fee

2. **Subscription fields in `profiles` table:**
   - `subscription_status` (active/inactive)
   - `subscription_end_date`
   - `free_transactions_remaining` (0-20)

3. **Transaction types:**
   - Internal: c2c, c2b, b2c, b2b
   - External: send_phone, buy_goods_till, paybill, etc.

---

## 🚀 What's Different Now

### Before (Old Prompt)
- ❌ Called it "M-Pesa assistant" (confusing)
- ❌ No mention of internal wallet
- ❌ No subscription features
- ❌ No free transactions
- ❌ No distinction between internal/external
- ❌ Only had send_phone, till, paybill types

### After (New Prompt)
- ✅ "Wallet assistant" (clear)
- ✅ Internal wallet system explained
- ✅ Subscription system included
- ✅ 20 free transactions/month
- ✅ Clear internal vs external distinction
- ✅ Full transaction types: c2c, c2b, b2c, b2b + all external

---

## 💡 Key Messaging Points

**The AI will now:**
1. Always clarify "from your wallet" vs "to M-Pesa"
2. Celebrate free transactions for subscribers
3. Encourage subscriptions (KES 5,000/month)
4. Mention remaining free sends
5. Guide users to load from M-Pesa when balance low
6. Distinguish internal (instant, cheap) vs external (M-Pesa fees)

---

## 🎉 Summary

Your prompt is now **100% aligned** with your actual system:

- ✅ Internal wallet transfers (C2C, C2B, B2C, B2B)
- ✅ Subscription system (KES 5,000/month)
- ✅ Free transactions (20/month for amounts ≥ KES 1,000)
- ✅ External M-Pesa payments
- ✅ Clear wallet vs M-Pesa distinction
- ✅ Database-backed features
- ✅ No confusion about "your own money"

**Users will now understand:**
- They have an Ongea Pesa WALLET (not using M-Pesa directly)
- They can send to OTHER Ongea Pesa users instantly
- Subscriptions give 20 free sends/month
- They can still pay M-Pesa services from their wallet

**No more confusion! Safi kabisa! 🚀**

# 💰 Ongea Pesa - Complete Revenue & Subscription Model

## 📊 Revenue Streams

### 1. **Monthly Subscription Fee: KES 5,000**
- Charged monthly per active user
- Provides access to premium features
- Includes 20 free transactions per month

### 2. **Platform Transaction Fee: 0.5%**
- Applied to all internal transfers (C2C, C2B, B2C, B2B)
- **Waived** for subscribers on transactions ≥ KES 1,000 (up to 20/month)
- Non-subscribers pay 0.5% on every transaction

### 3. **Total Revenue Calculation**
```
Monthly Revenue = (Subscription Fees) + (Platform Fees)

Example with 10,000 users:
- Subscribers (30%): 3,000 × KES 5,000 = KES 15,000,000
- Platform fees (avg 5 tx/user @ KES 2,000 × 0.5%):
  - Subscribers: 3,000 × 0 × 5 = KES 0 (free transactions used)
  - Non-subscribers: 7,000 × KES 2,000 × 5 × 0.5% = KES 3,500,000

TOTAL MONTHLY REVENUE = KES 18,500,000 (~$142,300 USD)
YEARLY REVENUE = KES 222,000,000 (~$1.7M USD)
```

---

## 🎁 Subscription Benefits

### Free Transaction Eligibility
✅ **Criteria to qualify for FREE transaction:**
1. Active subscription (KES 5,000/month paid)
2. Subscription not expired
3. Transaction amount ≥ KES 1,000
4. Free transactions remaining > 0 (max 20/month)

### How It Works
```
User with active subscription sends KES 5,000:

IF amount >= 1,000 AND free_tx_remaining > 0:
  ✅ FREE TRANSACTION
  - No platform fee charged
  - free_transactions_remaining decremented by 1
  - Platform revenue: KES 0

ELSE:
  💰 REGULAR TRANSACTION (0.5% fee)
  - Platform fee: KES 25 (0.5% of 5,000)
  - Platform revenue: KES 25
```

### Monthly Reset
- Free transaction counter resets on the 1st of each month
- Automatically set to 20 for active subscribers
- Tracked in `profiles.free_transactions_remaining`

---

## 🔄 Complete Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SPEAKS TO ELEVENLABS AI                           │
│    "Send 5000 shillings to John"                          │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ELEVENLABS AI EXTRACTS & VALIDATES                      │
│    - type: "send_phone" or internal transfer              │
│    - amount: 5000                                          │
│    - recipient: John's phone/email                         │
│    - user_id, wallet_balance sent in context              │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK: /api/voice/webhook (VALIDATION LAYER)         │
│                                                             │
│    A. Get user subscription status                         │
│       SELECT subscription_status, free_tx_remaining        │
│       FROM profiles WHERE id = user_id                     │
│                                                             │
│    B. Check free transaction eligibility                   │
│       IF subscription_active AND amount >= 1000            │
│          AND free_tx_remaining > 0:                        │
│         ✅ is_free_transaction = TRUE                     │
│         ✅ platform_fee = 0                               │
│       ELSE:                                                │
│         💰 platform_fee = amount × 0.5%                   │
│                                                             │
│    C. Validate wallet balance                              │
│       total_required = amount + platform_fee               │
│       IF wallet_balance < total_required:                  │
│         ❌ Return "Insufficient funds" to AI              │
│                                                             │
│    D. Prepare payload for n8n                              │
│       {                                                    │
│         user_id, amount, platform_fee,                     │
│         is_free_transaction,                               │
│         subscription_status,                               │
│         free_transactions_remaining                        │
│       }                                                    │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. N8N WORKFLOW: Process Transaction                       │
│    URL: https://primary-production-579c.up.railway.app/    │
│         webhook/send_money                                 │
│                                                             │
│    A. Determine transaction type:                          │
│       - Internal transfer → WalletService.sendMoney()     │
│       - M-Pesa send → M-Pesa API (Gate.io wallet)         │
│                                                             │
│    B. Process internal transfer:                           │
│       CALL process_internal_transfer() DB function         │
│         - Deduct from sender (amount + fee)               │
│         - Credit to recipient (amount)                     │
│         - Record platform_fee in revenue table            │
│         - Log in wallet_transaction_log                   │
│                                                             │
│    C. If free transaction, decrement counter:              │
│       IF is_free_transaction:                              │
│         UPDATE profiles                                    │
│         SET free_transactions_remaining -= 1               │
│         WHERE id = user_id                                 │
│                                                             │
│    D. Return success to webhook                            │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RESPONSE BACK TO ELEVENLABS AI                         │
│    {                                                       │
│      success: true,                                        │
│      amount: 5000,                                         │
│      platform_fee: 0 (or 25),                             │
│      new_balance: 24975,                                   │
│      free_tx_remaining: 19                                 │
│    }                                                       │
│                                                             │
│    AI speaks: "Transaction successful! You sent 5000       │
│    shillings. Your new balance is 24,975 shillings.       │
│    You have 19 free transactions remaining this month."   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏦 Gate.io Wallet Integration

### Main Wallet Architecture

```
┌───────────────────────────────────────────────────────────┐
│              GATE.IO WALLET (MAIN POOL)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   Total AUM: $100,000 USD (KES 15,000,000)         │ │
│  │   Currency: USDT / Crypto                           │ │
│  │                                                     │ │
│  │   User A: KES 5,000                                 │ │
│  │   User B: KES 10,000                                │ │
│  │   User C: KES 3,500                                 │ │
│  │   ... (internal accounting)                         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ↕ Deposits (M-Pesa → Gate.io)                          │
│  ↕ Withdrawals (Gate.io → M-Pesa)                       │
└───────────────────────────────────────────────────────────┘

Internal DB tracks user balances:
- profiles.wallet_balance (KES per user)
- Sum of all balances ≤ Total AUM in Gate wallet
```

### API Credentials Setup

**Your Gate.io API Keys:**
```env
GATE_API_KEY=d6ab37-905b50-ceb450-2e1d05-28f053
GATE_SECRET_KEY=57c2cf-26f768-1a622f-07fb49-8b3abf
```

**Add to `.env.local`:**
```bash
# Gate.io Wallet (Main Pool)
GATE_API_KEY=d6ab37-905b50-ceb450-2e1d05-28f053
GATE_SECRET_KEY=57c2cf-26f768-1a622f-07fb49-8b3abf
GATE_WALLET_ADDRESS=your_gate_wallet_address
GATE_API_URL=https://api.gate.io/api/v4
```

### Gate Wallet Operations

#### 1. **Check Main Wallet Balance**
```typescript
import { gateWalletService } from '@/lib/services/gateWalletService';

const balance = await gateWalletService.getWalletBalance('USDT');
console.log('Main wallet:', balance.total, 'USDT');
```

#### 2. **Record Deposit (M-Pesa → Gate)**
```typescript
// User deposits KES 10,000 via M-Pesa
await gateWalletService.recordDeposit(
  userId,
  10000,
  'MPesa_TxID_12345',
  'KES'
);

// Internally:
// 1. Convert KES → USDT (via exchange rate)
// 2. Wait for Gate.io confirmation
// 3. Credit user's internal balance
```

#### 3. **Process Withdrawal (Gate → M-Pesa)**
```typescript
// User withdraws KES 5,000 to M-Pesa
await gateWalletService.processWithdrawal(
  userId,
  5000,
  '254712345678',
  'KES'
);

// Internally:
// 1. Check Gate.io wallet has funds
// 2. Initiate Gate.io withdrawal
// 3. Trigger M-Pesa B2C payment
// 4. Deduct from user's internal balance
```

#### 4. **Get Total AUM (Assets Under Management)**
```typescript
const aum = await gateWalletService.getTotalAUM();
console.log('Total AUM:', aum.total_kes, 'KES');
console.log('Currencies:', aum.currencies);
```

---

## 💳 Subscription Payment Flow

### Pay via Wallet
```bash
POST /api/subscription/pay
Content-Type: application/json

{
  "payment_method": "wallet",
  "payment_reference": "SUB_123456"
}

# Deducts KES 5,000 from user's wallet balance
# Activates subscription for next month
# Resets free_transactions_remaining to 20
```

### Pay via M-Pesa
```bash
POST /api/subscription/pay
Content-Type: application/json

{
  "payment_method": "mpesa",
  "phone": "254712345678",
  "mpesa_transaction_id": "QF7XAMPLE123"
}

# Initiates M-Pesa STK push for KES 5,000
# On callback confirmation, activates subscription
```

### Check Subscription Status
```bash
GET /api/subscription/pay

Response:
{
  "subscription": {
    "status": "active",
    "is_active": true,
    "end_date": "2024-12-31T23:59:59Z",
    "free_transactions_remaining": 15,
    "total_free_tx_used": 5
  }
}
```

---

## 📊 Revenue Dashboard Updates

### Enhanced Metrics

```typescript
// Total Revenue = Subscription Fees + Platform Fees

GET /api/admin/revenue/summary?period=month

Response:
{
  "total_revenue": 18500000,  // KES
  "breakdown": {
    "subscription_fees": 15000000,  // 3,000 × 5,000
    "platform_fees": 3500000,       // Non-subscriber transactions
    "free_transactions_waived": 300000  // Value of free tx given
  },
  "subscribers": {
    "total": 3000,
    "active": 2850,
    "new_this_month": 120
  },
  "transactions": {
    "total": 50000,
    "free_transactions_used": 6000,
    "regular_transactions": 44000
  }
}
```

---

## 🔧 Setup Instructions

### 1. Run Database Migrations
```bash
# Apply wallet system
psql -U your_user -d ongea_pesa -f database/migrations/002_wallet_system.sql

# Apply subscription system
psql -U your_user -d ongea_pesa -f database/migrations/003_subscription_system.sql
```

### 2. Configure Environment Variables
```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - Gate.io API keys (provided above)
# - M-Pesa API keys
# - ElevenLabs API key
# - Supabase keys
```

### 3. Test Subscription Payment
```bash
# Test wallet payment
curl -X POST http://localhost:3000/api/subscription/pay \
  -H "Content-Type: application/json" \
  -d '{"payment_method": "wallet"}'

# Check status
curl http://localhost:3000/api/subscription/pay
```

### 4. Test Free Transaction
```bash
# User with active subscription sends KES 5,000
# Should be FREE (no platform fee)

curl -X POST http://localhost:3000/api/wallet/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_identifier": "user@example.com",
    "amount": 5000,
    "transaction_type": "c2c"
  }'

# Response should show:
# "platform_fee": 0
# "is_free_transaction": true
```

---

## 🎯 Revenue Projections

### Conservative (3,000 subscribers)
```
Monthly:
- Subscription: KES 15,000,000 ($115,000)
- Platform fees: KES 3,500,000 ($27,000)
TOTAL: KES 18,500,000 ($142,000/month)

Yearly: KES 222,000,000 ($1.7M)
```

### Moderate (10,000 subscribers)
```
Monthly:
- Subscription: KES 50,000,000 ($385,000)
- Platform fees: KES 8,000,000 ($62,000)
TOTAL: KES 58,000,000 ($447,000/month)

Yearly: KES 696,000,000 ($5.36M)
```

### Aggressive (30,000 subscribers)
```
Monthly:
- Subscription: KES 150,000,000 ($1.15M)
- Platform fees: KES 15,000,000 ($115,000)
TOTAL: KES 165,000,000 ($1.27M/month)

Yearly: KES 1,980,000,000 ($15.23M)
```

---

## ✅ Implementation Checklist

- [x] Database migration for subscriptions
- [x] Free transaction eligibility checker
- [x] Voice webhook subscription validation
- [x] Subscription payment API
- [x] Gate.io wallet service
- [x] Environment variables template
- [x] Revenue dashboard updates
- [ ] M-Pesa subscription payment integration
- [ ] Automated subscription renewal reminders
- [ ] Admin panel for subscription management
- [ ] Analytics for subscription conversion

---

## 🚀 Next Steps

1. **Test the system** with real transactions
2. **Integrate M-Pesa** for subscription payments
3. **Monitor revenue** via dashboard at `/admin`
4. **Promote subscriptions** to users (KES 5,000/month = 20 free sends!)
5. **Track conversion rate** (free users → subscribers)

---

**Your system is now configured to earn:**
- 💰 KES 5,000/user/month (subscriptions)
- 💰 0.5% per transaction (platform fees)
- 🎁 20 free transactions/month for subscribers

**Start monetizing! 🚀**

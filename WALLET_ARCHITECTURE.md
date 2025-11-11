# Ongea Pesa Wallet Architecture
## Internal Money Transfer System with B2C, C2B, B2B & C2S Transactions

---

## 🎯 Overview

The Ongea Pesa wallet system is designed as a **central pool of funds** where:
- Users load money into their **main wallet** (account wallet)
- All transactions happen **internally** within the pool
- Money stays within the ecosystem until withdrawal
- Supports **B2C, C2B, B2B, and C2S** transaction models
- Integrates with **M-Pesa** for loading/withdrawing funds
- All balances are **saved to the database** in real-time
- **Platform earns 0.5% fee** on all transactions

### Key Principles
```
┌─────────────────────────────────────────────────────┐
│                   CENTRAL WALLET POOL                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ User A   │  │ User B   │  │Business C│           │
│  │ KES 5000 │  │ KES 3000 │  │ KES 50K  │           │
│  └────┬─────┘  └─────┬────┘  └────┬─────┘           │
│       │              │             │                  │
│       └──────────────┴─────────────┘                  │
│         Internal Transfers (No M-Pesa)               │
│                                                       │
│  ↑ Load (M-Pesa → Pool)  ↓ Withdraw (Pool → M-Pesa) │
│                                                       │
│  Platform Fee: 0.5% per transaction → Creator Profit │
└─────────────────────────────────────────────────────┘
```

---

## 💰 Revenue Model (Platform Profits)

### Fee Structure
- **Platform Fee**: 0.5% on all internal transactions
- **M-Pesa Fee**: Pass-through (user pays M-Pesa directly)
- **Withdrawal Fee**: 0.5% platform fee + M-Pesa B2C fee

### Example Transaction Breakdown
```
User A sends KES 10,000 to User B (C2C):
├── Amount: KES 10,000
├── Platform Fee (0.5%): KES 50 → Goes to Ongea Pesa
├── User A debited: KES 10,050
└── User B credited: KES 10,000

Platform Profit: KES 50
```

### Monthly Revenue Projection
```
Assumptions:
- 10,000 active users
- Average 5 transactions/user/month
- Average transaction: KES 2,000

Monthly Revenue:
= 10,000 users × 5 tx × KES 2,000 × 0.5%
= KES 500,000/month platform fees
= ~$3,850 USD/month
```

---

## 🏗️ Wallet System Architecture

### 1. Main Wallet (Account Wallet)
Each user/business has **ONE main wallet** that holds their balance.

**Database Schema:**
```sql
CREATE TABLE main_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL, -- 'personal', 'business', 'system'
    
    -- Balances
    total_balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    pending_balance DECIMAL(15,2) DEFAULT 0.00,
    
    -- Configuration
    primary_currency VARCHAR(3) DEFAULT 'KES',
    wallet_status VARCHAR(20) DEFAULT 'active',
    daily_limit DECIMAL(15,2) DEFAULT 100000.00,
    monthly_limit DECIMAL(15,2) DEFAULT 1000000.00,
    
    -- M-Pesa Integration
    mpesa_linked BOOLEAN DEFAULT false,
    mpesa_phone VARCHAR(15),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT positive_balance CHECK (available_balance >= 0)
);
```

---

## 💼 Transaction Models

### 1. **C2B (Customer to Business)** ✅
**Use Case:** Customer pays a business for goods/services

```typescript
{
  "transaction_type": "c2b",
  "sender_id": "customer_user_id",
  "recipient_id": "business_user_id",
  "amount": 1500,
  "platform_fee": 7.50, // 0.5% of 1500
  "description": "Payment for groceries"
}
```

**Fee Split:**
- Customer pays: KES 1,507.50 (amount + platform fee)
- Business receives: KES 1,500
- Platform earns: KES 7.50

---

### 2. **B2C (Business to Customer)** ✅
**Use Case:** Business sends money to customers (salaries, refunds)

```typescript
{
  "transaction_type": "b2c",
  "sender_id": "business_user_id",
  "recipient_id": "customer_user_id",
  "amount": 5000,
  "platform_fee": 25, // 0.5% of 5000
  "description": "Salary payment"
}
```

---

### 3. **B2B (Business to Business)** ✅
**Use Case:** Business pays another business

```typescript
{
  "transaction_type": "b2b",
  "sender_id": "business_a_id",
  "recipient_id": "business_b_id",
  "amount": 50000,
  "platform_fee": 250, // 0.5% of 50000
  "description": "Supplier payment"
}
```

---

### 4. **C2S (Customer to System)** ✅
**Use Case:** Loading wallet from M-Pesa

```typescript
{
  "transaction_type": "c2s",
  "sender_id": "customer_user_id",
  "recipient_id": "system_wallet_id",
  "amount": 10000,
  "platform_fee": 0, // No fee for loading wallet
  "mpesa_fee": 40, // M-Pesa charges separately
  "description": "Wallet top-up"
}
```

---

### 5. **C2C (Customer to Customer)** ✅
**Use Case:** Person-to-person transfers

```typescript
{
  "transaction_type": "c2c",
  "sender_id": "user_a_id",
  "recipient_id": "user_b_id",
  "amount": 500,
  "platform_fee": 2.50, // 0.5% of 500
  "description": "Lunch money"
}
```

---

## 🗄️ Enhanced Database Schema

### Internal Transactions Table
```sql
CREATE TABLE internal_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction Type
    transaction_type VARCHAR(10) NOT NULL, -- 'c2b', 'b2c', 'b2b', 'c2s', 'c2c'
    transaction_category VARCHAR(30) NOT NULL, -- 'send', 'receive', 'load', 'withdraw', 'payment'
    
    -- Participants
    sender_wallet_id UUID REFERENCES main_wallets(wallet_id),
    recipient_wallet_id UUID REFERENCES main_wallets(wallet_id),
    sender_user_id UUID REFERENCES auth.users(id),
    recipient_user_id UUID REFERENCES auth.users(id),
    
    -- Financial Details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    platform_fee DECIMAL(15,2) DEFAULT 0.00, -- Ongea Pesa's 0.5% fee
    mpesa_fee DECIMAL(15,2) DEFAULT 0.00, -- M-Pesa fees (if applicable)
    total_fee DECIMAL(15,2) DEFAULT 0.00, -- platform_fee + mpesa_fee
    net_amount DECIMAL(15,2) NOT NULL, -- amount - fees
    
    -- Balances (snapshot for audit)
    sender_balance_before DECIMAL(15,2),
    sender_balance_after DECIMAL(15,2),
    recipient_balance_before DECIMAL(15,2),
    recipient_balance_after DECIMAL(15,2),
    
    -- References
    reference_number VARCHAR(100) UNIQUE,
    external_reference VARCHAR(100), -- M-Pesa transaction ID
    mpesa_transaction_id VARCHAR(100),
    
    -- Details
    description TEXT,
    metadata JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'reversed'
    failure_reason TEXT,
    
    -- Source
    initiated_via VARCHAR(20) DEFAULT 'app', -- 'app', 'voice', 'api', 'ussd'
    voice_command_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT different_wallets CHECK (sender_wallet_id != recipient_wallet_id)
);

-- Index for fast queries
CREATE INDEX idx_transactions_sender ON internal_transactions(sender_user_id, created_at DESC);
CREATE INDEX idx_transactions_recipient ON internal_transactions(recipient_user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON internal_transactions(status);
CREATE INDEX idx_transactions_type ON internal_transactions(transaction_type);
```

### Platform Revenue Tracking
```sql
CREATE TABLE platform_revenue (
    revenue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES internal_transactions(transaction_id),
    revenue_type VARCHAR(30) NOT NULL, -- 'platform_fee', 'subscription', 'premium'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    transaction_type VARCHAR(10), -- Which transaction type generated this
    created_at TIMESTAMP DEFAULT NOW(),
    posted_date DATE DEFAULT CURRENT_DATE
);

-- Index for revenue reports
CREATE INDEX idx_revenue_date ON platform_revenue(posted_date DESC);
CREATE INDEX idx_revenue_type ON platform_revenue(revenue_type, posted_date DESC);
```

### Wallet Transaction Log (Audit Trail)
```sql
CREATE TABLE wallet_transaction_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES main_wallets(wallet_id),
    transaction_id UUID REFERENCES internal_transactions(transaction_id),
    transaction_type VARCHAR(10),
    amount DECIMAL(15,2),
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    operation VARCHAR(20), -- 'debit', 'credit'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_log ON wallet_transaction_log(wallet_id, created_at DESC);
```

---

## 🔌 API Endpoints

### 1. Load Money to Wallet (C2S via M-Pesa)
```typescript
// POST /api/wallet/load
{
  "phone_number": "254712345678",
  "amount": 5000,
  "payment_method": "mpesa"
}

// Response
{
  "success": true,
  "transaction_id": "tx_abc123",
  "status": "pending",
  "message": "STK push sent to 254712345678",
  "mpesa_fee": 30,
  "total_debit": 5030
}
```

### 2. Send Money (C2C, C2B, B2C, B2B)
```typescript
// POST /api/wallet/send
{
  "recipient_identifier": "user@email.com" | "254712345678" | "till_12345",
  "amount": 1000,
  "transaction_type": "c2b" | "b2c" | "b2b" | "c2c",
  "description": "Payment for services",
  "pin": "****" // Security
}

// Response
{
  "success": true,
  "transaction_id": "tx_xyz789",
  "status": "completed",
  "amount": 1000,
  "platform_fee": 5,
  "total_debit": 1005,
  "sender_balance": 4995,
  "recipient_balance": 6000,
  "reference": "REF1234567890"
}
```

### 3. Withdraw Money (S2C via M-Pesa)
```typescript
// POST /api/wallet/withdraw
{
  "phone_number": "254712345678",
  "amount": 2000,
  "pin": "****"
}

// Response
{
  "success": true,
  "transaction_id": "tx_withdraw_123",
  "status": "processing",
  "amount": 2000,
  "platform_fee": 10,
  "mpesa_fee": 33,
  "total_debit": 2043,
  "mpesa_request_id": "mpesa_req_456"
}
```

### 4. Check Balance
```typescript
// GET /api/wallet/balance

// Response
{
  "success": true,
  "wallet_id": "wallet_123",
  "available_balance": 5000.00,
  "pending_balance": 500.00,
  "total_balance": 5500.00,
  "currency": "KES",
  "daily_limit": 100000.00,
  "daily_used": 15000.00
}
```

---

## 📊 Creator Profit Dashboard

### Admin Dashboard API
```typescript
// GET /api/admin/revenue/summary?period=month&year=2024&month=11

// Response
{
  "success": true,
  "period": "2024-11",
  "summary": {
    "total_revenue": 125450.50,
    "platform_fees": 125450.50,
    "transaction_count": 25091,
    "unique_users": 8542,
    "average_transaction": 1000.35
  },
  "by_transaction_type": {
    "c2c": { "count": 15000, "revenue": 75000 },
    "c2b": { "count": 8000, "revenue": 40000 },
    "b2c": { "count": 1500, "revenue": 7500 },
    "b2b": { "count": 500, "revenue": 2500 },
    "withdrawals": { "count": 91, "revenue": 450.50 }
  },
  "daily_breakdown": [
    { "date": "2024-11-01", "revenue": 4500, "transactions": 900 },
    { "date": "2024-11-02", "revenue": 4200, "transactions": 840 }
  ]
}
```

### Revenue Analytics API
```typescript
// GET /api/admin/revenue/analytics?start_date=2024-01-01&end_date=2024-11-30

// Response
{
  "success": true,
  "total_revenue": 1500000,
  "growth_rate": 15.5,
  "top_revenue_sources": [
    { "type": "c2c", "percentage": 60, "amount": 900000 },
    { "type": "c2b", "percentage": 32, "amount": 480000 }
  ],
  "monthly_trend": [
    { "month": "2024-01", "revenue": 100000 },
    { "month": "2024-02", "revenue": 115000 }
  ]
}
```

---

## 🔄 Integration Flow

### Complete Transaction Flow
```
┌─────────────────────────────────────────────────────────┐
│  1. USER INITIATES TRANSACTION (Voice/App/API)         │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  2. VALIDATE REQUEST                                    │
│     - Check user authentication                         │
│     - Validate recipient exists                         │
│     - Calculate platform fee (0.5%)                     │
│     - Check sender balance >= amount + fees             │
│     - Verify daily/monthly limits                       │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  3. CREATE TRANSACTION RECORD                           │
│     - Status: 'pending'                                 │
│     - Generate reference number                         │
│     - Lock sender balance (pending)                     │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  4. PROCESS TRANSACTION (Database Transaction)          │
│     BEGIN TRANSACTION;                                  │
│       - Deduct from sender wallet (amount + fee)        │
│       - Credit to recipient wallet (amount)             │
│       - Credit platform revenue (fee)                   │
│       - Update transaction status: 'completed'          │
│       - Log in wallet_transaction_log                   │
│       - Record in platform_revenue                      │
│     COMMIT;                                             │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  5. POST-PROCESSING                                     │
│     - Send SMS/push notifications                       │
│     - Update analytics                                  │
│     - Trigger webhooks if configured                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 M-Pesa Integration

### Loading Money Flow (C2S)
```
User → App → API → M-Pesa STK Push → User Confirms → M-Pesa Callback → Credit Wallet
```

**Implementation:**
```typescript
// 1. Initiate STK Push
POST /api/mpesa/stkpush
{
  "phone": "254712345678",
  "amount": 5000,
  "account_ref": "TopUp"
}

// 2. M-Pesa Callback Handler
POST /api/mpesa/callback
{
  "ResultCode": 0,
  "Amount": 5000,
  "MpesaReceiptNumber": "PGH7XYZ123",
  "PhoneNumber": "254712345678"
}

// 3. Process in Callback
- Find user by phone number
- Create internal transaction (type: 'c2s', category: 'load')
- Credit user wallet (NO platform fee for loading)
- Update transaction status: 'completed'
- Store M-Pesa receipt number
```

---

## 🚀 Implementation Files

### File Structure
```
c:/Users/EP/Documents/GitHub/ongea-pesa/
├── lib/
│   └── services/
│       └── walletService.ts (Core wallet logic)
├── app/
│   └── api/
│       ├── wallet/
│       │   ├── load/route.ts
│       │   ├── send/route.ts
│       │   ├── withdraw/route.ts
│       │   └── balance/route.ts (already exists)
│       └── admin/
│           └── revenue/
│               ├── summary/route.ts
│               └── analytics/route.ts
├── components/
│   └── admin/
│       ├── revenue-dashboard.tsx
│       ├── transaction-analytics.tsx
│       └── profit-charts.tsx
└── database/
    └── migrations/
        └── 002_wallet_system.sql
```

---

## 🔐 Security Measures

1. **Transaction PIN**: Required for sending money
2. **Balance Locks**: Atomic database transactions
3. **Rate Limiting**: Prevent abuse
4. **Audit Logging**: Track all wallet changes
5. **Encryption**: Sensitive data encrypted at rest
6. **2FA**: For high-value transactions (>KES 50,000)

---

## 📈 Key Performance Indicators (KPIs)

### Platform Health
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Transaction Volume
- Average Transaction Value
- Platform Revenue Growth

### User Metrics
- User Acquisition Rate
- Churn Rate
- Customer Lifetime Value (CLV)
- Transaction Success Rate

### Revenue Metrics
- Monthly Recurring Revenue (MRR)
- Revenue Per User
- Transaction Fee Revenue
- Growth Rate

---

**Last Updated**: November 10, 2024  
**Version**: 1.0.0  
**Status**: Ready for Implementation 🚀

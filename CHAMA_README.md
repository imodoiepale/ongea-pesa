# ONGEA PESA CHAMA COLLECTION SYSTEM
## Traditional African Group Savings with Modern Technology

**Digitizing the Merry-Go-Round: Automated Bulk Collections, Real-Time Tracking, and Transparent Payouts**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![IndexPay](https://img.shields.io/badge/IndexPay-M--Pesa-orange)](https://indexpay.co.ke/)

---

## 📖 What is a Chama?

A **Chama** is a traditional African savings group where members contribute a fixed amount regularly. The pooled funds are given to one member at a time on a rotating basis (also known as a "merry-go-round"). This system has been used for decades across Kenya and East Africa for:

- **Community Savings**: Building emergency funds together
- **Investment Capital**: Pooling money for business ventures
- **Social Support**: Helping members during life events
- **Financial Discipline**: Enforced regular savings

**Traditional Challenges**:
- Manual collection by treasurer (time-consuming)
- Tracking payments in Excel or notebooks (error-prone)
- Delayed payouts due to incomplete collections
- Lack of transparency and trust issues
- No automated reminders or follow-ups

**Ongea Pesa Solution**: Fully automated chama management with bulk M-Pesa STK push, real-time tracking, automatic retries, and transparent rotation.

---

## 🎯 Key Features

### 1. **Bulk STK Push Collection**
- Send payment requests to **all members simultaneously**
- Example: 30 members = 30 STK pushes in under 15 seconds
- 500ms delay between requests to avoid rate limiting
- Each member gets M-Pesa prompt on their phone instantly

### 2. **Real-Time Payment Tracking**
- Live status updates: Pending, Processing, Completed, Failed
- Automatic polling of IndexPay settlements API every 5 seconds
- Match payments to members by phone number
- Visual dashboard showing who has paid

### 3. **Automatic Retry Logic**
- Failed payments automatically retried (up to 3 attempts)
- Configurable retry intervals
- SMS/notification reminders for pending members
- Grace period before marking as defaulted

### 4. **Flexible Rotation Types**
- **Sequential**: Fixed order (Member 1 → Member 2 → Member 3...)
- **Random**: Randomized each cycle for fairness
- **Bidding**: Members bid for early position
- **Needs-Based**: Priority to members with urgent needs

### 5. **Automated Distribution**
- Instant payout to rotation recipient via M-Pesa B2C
- Automatic advancement to next cycle
- Full audit trail of all distributions
- Configurable payout conditions (all paid vs. grace period)

### 6. **Comprehensive Analytics**
- Total collected per cycle
- Member contribution history
- Default tracking and late fees
- Projected payout dates
- Group performance metrics

---

## 🏗️ System Architecture

### Chama Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAMA ADMIN DASHBOARD                        │
│  • Create chama                                                 │
│  • Add members                                                  │
│  • Start collection                                             │
│  • Monitor progress                                             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  START COLLECTION (API CALL)                    │
│  POST /api/chama/start-collection                               │
│  { chama_id: "uuid" }                                           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              BULK STK PUSH (30 Members Example)                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ FOR EACH MEMBER:                                      │      │
│  │   1. Send STK push via IndexPay API                   │      │
│  │   2. Store checkout_request_id in DB                  │      │
│  │   3. Wait 500ms (rate limiting)                       │      │
│  │   4. Continue to next member                          │      │
│  └──────────────────────────────────────────────────────┘      │
│  Result: 30 STK requests sent in ~15 seconds                    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REAL-TIME STATUS POLLING                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ EVERY 5 SECONDS:                                      │      │
│  │   1. Query IndexPay settlements API                   │      │
│  │   2. Match payments by phone/account_number           │      │
│  │   3. Update chama_stk_requests status                 │      │
│  │   4. Update chama_cycles collected_amount             │      │
│  │   5. Trigger notifications for completed payments     │      │
│  └──────────────────────────────────────────────────────┘      │
│  Status: pending → processing → completed/failed                │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HANDLE FAILED PAYMENTS                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ IF payment failed:                                    │      │
│  │   1. Check attempt_count < max_attempts (3)           │      │
│  │   2. Send retry STK push                              │      │
│  │   3. Increment attempt_count                          │      │
│  │   4. Send reminder notification                       │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DISTRIBUTION WHEN COMPLETE                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ TRIGGER CONDITIONS:                                   │      │
│  │   • All members paid (100% collection), OR            │      │
│  │   • Grace period expired (48 hours default)           │      │
│  │                                                        │      │
│  │ DISTRIBUTION PROCESS:                                 │      │
│  │   1. Calculate total collected amount                 │      │
│  │   2. Deduct platform fee (if applicable)              │      │
│  │   3. Send M-Pesa B2C to rotation recipient            │      │
│  │   4. Log payout in chama_payouts table                │      │
│  │   5. Mark cycle as completed                          │      │
│  │   6. Advance rotation to next member                  │      │
│  │   7. Create next cycle record                         │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. **chamas** - Main Group Configuration
```sql
CREATE TABLE public.chamas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Pocket integration
  chama_pocket_id text,  -- Dedicated Gate pocket for this chama
  gate_name text,
  
  -- Collection settings
  contribution_amount numeric DEFAULT 0,
  currency text DEFAULT 'KES',
  collection_frequency text NOT NULL,  -- daily, weekly, biweekly, monthly, custom
  collection_day integer,  -- Day of week (1-7) or month (1-31)
  
  -- Rotation settings
  rotation_type text DEFAULT 'sequential',  -- sequential, random, bidding, needs_based
  current_rotation_index integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'active',  -- draft, active, paused, completed, dissolved
  current_cycle integer DEFAULT 1,
  total_cycles integer,  -- NULL for indefinite
  
  -- Totals
  total_collected numeric DEFAULT 0,
  total_distributed numeric DEFAULT 0,
  
  -- Settings
  late_fee_percentage numeric DEFAULT 5,
  grace_period_hours integer DEFAULT 24,
  allow_partial_payments boolean DEFAULT true,
  require_all_before_payout boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### 2. **chama_members** - Group Members
```sql
CREATE TABLE public.chama_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  
  -- Contact info
  name text NOT NULL,
  phone_number text NOT NULL,
  email text,
  
  -- Role
  role text DEFAULT 'member',  -- admin, treasurer, secretary, member
  
  -- Rotation
  rotation_position integer,
  has_received_payout boolean DEFAULT false,
  last_payout_date timestamp with time zone,
  
  -- Tracking
  total_contributed numeric DEFAULT 0,
  total_received numeric DEFAULT 0,
  pending_amount numeric DEFAULT 0,
  
  -- Status
  status text DEFAULT 'active',  -- pending, active, suspended, removed
  joined_at timestamp with time zone DEFAULT now(),
  
  UNIQUE (chama_id, phone_number)
);
```

#### 3. **chama_cycles** - Collection Cycles
```sql
CREATE TABLE public.chama_cycles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL,
  
  -- Collection period
  collection_start timestamp with time zone NOT NULL,
  collection_end timestamp with time zone NOT NULL,
  
  -- Recipient
  recipient_member_id uuid REFERENCES public.chama_members(id),
  recipient_phone text,
  
  -- Amounts
  expected_amount numeric NOT NULL,
  collected_amount numeric DEFAULT 0,
  distributed_amount numeric DEFAULT 0,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, collecting, collected, distributing, completed, failed
  
  -- Tracking
  members_paid integer DEFAULT 0,
  members_pending integer DEFAULT 0,
  members_failed integer DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  UNIQUE (chama_id, cycle_number)
);
```

#### 4. **chama_stk_requests** - Individual STK Tracking
```sql
CREATE TABLE public.chama_stk_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.chama_cycles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id),
  
  -- STK details
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  checkout_request_id text,
  merchant_request_id text,
  account_number text,
  mpesa_receipt_number text,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, sent, processing, completed, failed, cancelled, expired
  
  -- Retry tracking
  attempt_count integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  last_attempt_at timestamp with time zone,
  
  -- Error tracking
  error_code text,
  error_message text,
  
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);
```

#### 5. **chama_payouts** - Distribution Records
```sql
CREATE TABLE public.chama_payouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.chama_cycles(id),
  member_id uuid NOT NULL REFERENCES public.chama_members(id),
  
  -- Payout details
  amount numeric NOT NULL,
  phone_number text NOT NULL,
  payment_method text DEFAULT 'mpesa',
  external_ref text,
  mpesa_transaction_id text,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, processing, completed, failed
  
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);
```

---

## 🔌 API Endpoints

### 1. Create Chama
**POST** `/api/chama/create`

```typescript
{
  name: "Office Savings Group",
  description: "Monthly savings for office colleagues",
  contribution_amount: 5000,
  currency: "KES",
  collection_frequency: "monthly",
  collection_day: 25,
  rotation_type: "sequential",
  total_cycles: 12,
  late_fee_percentage: 5,
  grace_period_hours: 48,
  allow_partial_payments: false,
  require_all_before_payout: true,
  members: [
    { name: "John Doe", phone: "0712345678", email: "john@email.com" },
    { name: "Jane Smith", phone: "0723456789", email: "jane@email.com" }
  ]
}
```

**Response**:
```typescript
{
  success: true,
  chama_id: "uuid",
  message: "Chama created successfully"
}
```

### 2. Add Member
**POST** `/api/chama/add-member`

```typescript
{
  chama_id: "uuid",
  name: "Bob Wilson",
  phone: "0734567890",
  email: "bob@email.com",
  role: "member"
}
```

### 3. Start Collection
**POST** `/api/chama/start-collection`

```typescript
{
  chama_id: "uuid"
}
```

**Response**:
```typescript
{
  success: true,
  cycle_id: "uuid",
  stk_sent: 30,
  stk_failed: 0,
  results: [
    {
      member_id: "uuid",
      phone: "0712345678",
      status: "sent",
      checkout_request_id: "ws_CO_xxx"
    }
  ]
}
```

### 4. Poll STK Status
**GET** `/api/chama/poll-stk?cycle_id={uuid}`

**Response**:
```typescript
{
  cycle_id: "uuid",
  total_members: 30,
  completed: 25,
  pending: 3,
  failed: 2,
  collected_amount: 125000,
  expected_amount: 150000,
  completion_percentage: 83.3,
  payments: [
    {
      member_name: "John Doe",
      phone: "0712345678",
      amount: 5000,
      status: "completed",
      mpesa_receipt: "QGX123ABC"
    }
  ]
}
```

### 5. Retry Failed STK
**POST** `/api/chama/retry-stk`

```typescript
{
  cycle_id: "uuid",
  member_id: "uuid"
}
```

### 6. Distribute Funds
**POST** `/api/chama/distribute`

```typescript
{
  cycle_id: "uuid"
}
```

**Response**:
```typescript
{
  success: true,
  payout_id: "uuid",
  recipient: "Jane Smith",
  amount: 148500,
  mpesa_transaction_id: "QGX456DEF",
  next_cycle_number: 2,
  next_recipient: "Bob Wilson"
}
```

### 7. Shuffle Rotation
**POST** `/api/chama/shuffle-rotation`

```typescript
{
  chama_id: "uuid",
  rotation_type: "random"  // or "sequential", "bidding", "needs_based"
}
```

---

## 💡 Usage Examples

### Example 1: Monthly Office Chama (30 Members)

```typescript
// 1. Create chama
const chama = await fetch('/api/chama/create', {
  method: 'POST',
  body: JSON.stringify({
    name: "Nairobi Office Savings",
    contribution_amount: 5000,
    collection_frequency: "monthly",
    collection_day: 1,  // 1st of every month
    rotation_type: "sequential",
    total_cycles: 30,  // 30 months (each member gets once)
    require_all_before_payout: true,
    members: [/* 30 members */]
  })
});

// 2. On 1st of month, start collection
const collection = await fetch('/api/chama/start-collection', {
  method: 'POST',
  body: JSON.stringify({ chama_id: chama.chama_id })
});
// → 30 STK pushes sent in 15 seconds

// 3. Poll status every 5 seconds
const interval = setInterval(async () => {
  const status = await fetch(`/api/chama/poll-stk?cycle_id=${collection.cycle_id}`);
  const data = await status.json();
  
  console.log(`Collected: ${data.completed}/${data.total_members}`);
  console.log(`Amount: KES ${data.collected_amount}`);
  
  if (data.completion_percentage === 100) {
    clearInterval(interval);
    // All paid! Distribute funds
    await fetch('/api/chama/distribute', {
      method: 'POST',
      body: JSON.stringify({ cycle_id: collection.cycle_id })
    });
  }
}, 5000);

// 4. Retry failed payments
if (data.failed > 0) {
  for (const payment of data.payments) {
    if (payment.status === 'failed') {
      await fetch('/api/chama/retry-stk', {
        method: 'POST',
        body: JSON.stringify({
          cycle_id: collection.cycle_id,
          member_id: payment.member_id
        })
      });
    }
  }
}
```

### Example 2: Weekly Investment Club (10 Members)

```typescript
const investmentClub = await fetch('/api/chama/create', {
  method: 'POST',
  body: JSON.stringify({
    name: "Tech Founders Investment Club",
    contribution_amount: 10000,
    collection_frequency: "weekly",
    collection_day: 5,  // Every Friday
    rotation_type: "bidding",  // Members bid for early position
    allow_partial_payments: false,
    late_fee_percentage: 10,
    members: [/* 10 members */]
  })
});
```

### Example 3: Emergency Fund Chama (Needs-Based)

```typescript
const emergencyFund = await fetch('/api/chama/create', {
  method: 'POST',
  body: JSON.stringify({
    name: "Community Emergency Fund",
    contribution_amount: 2000,
    collection_frequency: "biweekly",
    rotation_type: "needs_based",  // Priority to urgent needs
    require_all_before_payout: false,  // Payout even if not 100%
    grace_period_hours: 72,
    members: [/* members */]
  })
});
```

---

## 🔐 Security Features

### 1. **Row-Level Security (RLS)**
- Members can only view chamas they belong to
- Only admins can start collections
- Only creators can modify chama settings

### 2. **STK Push Security**
- User must enter M-Pesa PIN to confirm payment
- Payments cannot be initiated without user consent
- All transactions logged with timestamps

### 3. **Automatic Retry Limits**
- Maximum 3 retry attempts per member
- Prevents spam and abuse
- Configurable retry intervals

### 4. **Audit Trail**
- Full history of all collections
- Payout records with M-Pesa receipts
- Member contribution tracking
- Dispute resolution support

### 5. **Pocket Isolation**
- Each chama gets dedicated Gate pocket
- Funds isolated from other chamas
- Transparent balance tracking
- Automatic reconciliation

---

## 📊 Analytics & Reporting

### Member Dashboard
- Total contributed to date
- Expected payout date
- Contribution history
- Late payment penalties
- Rotation position

### Admin Dashboard
- Total collected per cycle
- Collection completion rate
- Average collection time
- Default tracking
- Member performance metrics

### Group Analytics
- Total savings accumulated
- Distribution history
- Growth trends
- Member retention rate
- Financial health score

---

## 🚀 Getting Started

### 1. Access Chama Page
Navigate to `/chama` in your Ongea Pesa app

### 2. Create New Chama
Click "New Chama" and fill in:
- Group name and description
- Contribution amount
- Collection frequency
- Rotation type
- Member list

### 3. Add Members
Import from contacts or add manually:
- Name
- Phone number
- Email (optional)
- Role (admin/treasurer/member)

### 4. Start First Collection
Click "Start Collection" to:
- Send STK push to all members
- Monitor real-time status
- Retry failed payments
- Distribute when complete

### 5. Monitor Progress
Real-time dashboard shows:
- Who has paid
- Who is pending
- Failed payments
- Total collected
- Time remaining

---

## 🎯 Best Practices

### For Admins
1. **Set Clear Rules**: Define contribution amounts, deadlines, and penalties upfront
2. **Communicate**: Notify members before collection starts
3. **Monitor Actively**: Check status regularly and retry failed payments
4. **Be Transparent**: Share all financial records with members
5. **Handle Defaults**: Have clear policy for late/missing payments

### For Members
1. **Keep Phone Active**: Ensure M-Pesa line is active on collection day
2. **Maintain Balance**: Have sufficient funds before collection
3. **Respond Quickly**: Confirm STK push within 2 minutes
4. **Track Contributions**: Monitor your payment history
5. **Plan Ahead**: Know your payout date and plan usage

### For Treasurers
1. **Reconcile Daily**: Match all payments to members
2. **Document Everything**: Keep records of all transactions
3. **Follow Up**: Contact members with failed payments
4. **Report Regularly**: Share updates with the group
5. **Secure Funds**: Ensure pocket balance matches records

---

## 🔧 Troubleshooting

### STK Push Not Received
- Check phone number is correct
- Ensure M-Pesa line is active
- Verify sufficient Safaricom signal
- Wait 2 minutes and retry

### Payment Failed
- Check M-Pesa balance
- Ensure correct PIN entered
- Verify no transaction limits exceeded
- Contact Safaricom if persistent

### Payout Delayed
- Verify all members paid (if required)
- Check grace period hasn't expired
- Ensure recipient phone is active
- Contact admin for manual distribution

---

## 📞 Support

For Chama-specific support:
- **Documentation**: [CHAMA_README.md](CHAMA_README.md)
- **Main Platform**: [README.md](README.md)
- **Email**: chama-support@ongeapesa.com

---

**Built with ❤️ in Nairobi, Kenya** 🇰🇪

**Ongea Pesa Chama** — *Traditional Savings, Modern Technology*

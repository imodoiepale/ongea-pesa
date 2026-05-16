# ONGEA PESA ESCROW SYSTEM
## Crypto-Grade Transaction Security for Digital Commerce

**Secure Payments with Multi-Signature Protection, Time-Locks, Milestone Releases, and Built-In Dispute Resolution**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![IndexPay](https://img.shields.io/badge/IndexPay-M--Pesa-orange)](https://indexpay.co.ke/)

---

## 📖 What is Escrow?

**Escrow** is a financial arrangement where a neutral third party holds funds until predetermined conditions are met. This protects both buyers and sellers in transactions by ensuring:

- **Buyer Protection**: Funds only released when goods/services delivered
- **Seller Protection**: Payment guaranteed once conditions met
- **Dispute Resolution**: Neutral arbitrator can resolve conflicts
- **Trust Building**: Reduces risk in peer-to-peer transactions

**Traditional Escrow Challenges**:
- High fees (3-5% of transaction value)
- Slow processing (3-7 days)
- Limited to large transactions
- Complex legal paperwork
- No automation or smart conditions

**Ongea Pesa Solution**: Crypto-grade escrow with multi-signature security, time-locks, milestone-based releases, and automated dispute resolution - all accessible via M-Pesa.

---

## 🎯 Key Features

### 1. **Crypto-Grade Safety Features**

#### Multi-Signature (2-of-3)
- Requires multiple parties to approve release
- Prevents single-party fraud
- Configurable signature requirements (2-of-3, 3-of-5, etc.)
- Each participant must explicitly approve

#### Time-Lock Protection
- Funds locked until specific date/time
- Prevents premature withdrawals
- Auto-release after deadline (if no dispute)
- Configurable lock periods

#### Milestone-Based Releases
- Split payment into stages
- Release funds as work progresses
- Each milestone requires approval
- Partial payments for partial delivery

#### Dispute Resolution
- Built-in arbitration system
- Evidence submission (documents, screenshots)
- Neutral arbitrator decision
- Automatic fund distribution based on outcome

### 2. **Escrow Types**

#### Two-Party Escrow
- Simple buyer-seller arrangement
- Optional arbitrator for disputes
- Single payment, single release
- Best for: Freelance work, product purchases

#### Multi-Party Escrow
- Multiple contributors funding one escrow
- Shared ownership of funds
- Collective decision-making
- Best for: Group purchases, joint investments

#### Milestone-Based Escrow
- Payment split into stages
- Each milestone has conditions
- Progressive fund release
- Best for: Long-term projects, construction, software development

#### Time-Locked Escrow
- Funds locked until specific date
- Auto-release if no dispute raised
- Deadline-driven releases
- Best for: Rental deposits, advance payments

### 3. **M-Pesa Integration**

- **Fund via STK Push**: Instant M-Pesa deposits
- **Release via B2C**: Direct payouts to seller
- **Refund Support**: Return funds to buyer if needed
- **Fee Deduction**: Automatic platform fee calculation
- **Receipt Tracking**: M-Pesa transaction IDs logged

---

## 🏗️ System Architecture

### Escrow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUYER CREATES ESCROW                         │
│  POST /api/escrow/create                                        │
│  • Define terms and conditions                                  │
│  • Set total amount and milestones                              │
│  • Add seller and arbitrator                                    │
│  • Configure safety features                                    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SELLER ACCEPTS TERMS                           │
│  • Reviews escrow conditions                                    │
│  • Accepts or negotiates terms                                  │
│  • Escrow status: draft → pending_funding                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUYER FUNDS ESCROW                            │
│  POST /api/escrow/fund                                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 1. Send M-Pesa STK push to buyer                     │      │
│  │ 2. Buyer enters PIN and confirms                     │      │
│  │ 3. Funds deposited to escrow pocket                  │      │
│  │ 4. Escrow status: pending_funding → funded           │      │
│  │ 5. Notify seller to begin work                       │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SELLER DELIVERS WORK                            │
│  • Completes goods/services                                     │
│  • Submits proof of delivery                                    │
│  • Uploads evidence (photos, documents)                         │
│  • Requests milestone approval                                  │
│  • Escrow status: funded → in_progress                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              BUYER REVIEWS & APPROVES                           │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ IF satisfied:                                         │      │
│  │   • Approve milestone/full release                    │      │
│  │   • Funds released to seller via M-Pesa B2C           │      │
│  │   • Escrow status: in_progress → completed            │      │
│  │                                                        │      │
│  │ IF NOT satisfied:                                     │      │
│  │   • Raise dispute                                     │      │
│  │   • Submit evidence                                   │      │
│  │   • Escrow status: in_progress → disputed             │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              DISPUTE RESOLUTION (IF NEEDED)                     │
│  POST /api/escrow/dispute                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 1. Arbitrator reviews evidence from both parties      │      │
│  │ 2. Makes decision: buyer_wins / seller_wins / split  │      │
│  │ 3. Funds distributed according to decision            │      │
│  │    • buyer_wins: Refund to buyer                      │      │
│  │    • seller_wins: Release to seller                   │      │
│  │    • split: Partial to both parties                   │      │
│  │ 4. Escrow status: disputed → completed                │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ESCROW COMPLETED                             │
│  • All funds distributed                                        │
│  • Transaction records finalized                                │
│  • Receipts issued to all parties                               │
│  • Feedback/ratings collected                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. **escrows** - Main Escrow Contracts
```sql
CREATE TABLE public.escrows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  title text NOT NULL,
  description text,
  escrow_type text NOT NULL,  -- two_party, multi_party, milestone, time_locked
  
  -- Parties
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  buyer_id uuid REFERENCES auth.users(id),
  seller_id uuid REFERENCES auth.users(id),
  arbitrator_id uuid REFERENCES auth.users(id),
  
  -- Financial
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  currency text DEFAULT 'KES',
  funded_amount numeric DEFAULT 0,
  released_amount numeric DEFAULT 0,
  fee_percentage numeric DEFAULT 1.5,
  
  -- Pocket integration
  escrow_pocket_id text,  -- Dedicated Gate pocket
  gate_name text,
  
  -- Status
  status text DEFAULT 'draft',  -- draft, pending_funding, funded, in_progress, 
                                 -- pending_release, completed, disputed, 
                                 -- cancelled, refunded, expired
  
  -- Safety features
  requires_multi_sig boolean DEFAULT false,
  required_signatures integer DEFAULT 1,
  collected_signatures integer DEFAULT 0,
  
  -- Time-lock
  lock_until timestamp with time zone,
  auto_release_at timestamp with time zone,
  expiry_date timestamp with time zone,
  
  -- Conditions
  release_conditions jsonb DEFAULT '[]',
  conditions_met jsonb DEFAULT '[]',
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  funded_at timestamp with time zone,
  completed_at timestamp with time zone
);
```

#### 2. **escrow_participants** - All Parties Involved
```sql
CREATE TABLE public.escrow_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  
  role text NOT NULL,  -- buyer, seller, arbitrator, observer, signer
  
  -- Contribution (for multi-party)
  contribution_amount numeric DEFAULT 0,
  contribution_paid boolean DEFAULT false,
  
  -- Signature/approval
  has_signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  signature_required boolean DEFAULT false,
  
  -- Contact
  phone_number text,
  email text,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, accepted, rejected, completed
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  
  UNIQUE (escrow_id, user_id)
);
```

#### 3. **escrow_milestones** - Milestone-Based Releases
```sql
CREATE TABLE public.escrow_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  sequence_order integer NOT NULL,
  
  -- Amount
  amount numeric NOT NULL CHECK (amount > 0),
  percentage numeric,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, in_progress, submitted, 
                                   -- approved, released, disputed
  
  -- Approval
  submitted_at timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  released_at timestamp with time zone,
  
  -- Evidence
  proof_documents jsonb DEFAULT '[]',
  notes text,
  due_date timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### 4. **escrow_transactions** - All Money Movements
```sql
CREATE TABLE public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.escrow_milestones(id),
  
  -- Transaction type
  transaction_type text NOT NULL,  -- funding, release, refund, fee, 
                                    -- dispute_hold, arbitration
  
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  
  -- Payment tracking
  payment_method text,  -- mpesa, wallet, bank
  external_ref text,
  mpesa_transaction_id text,
  stk_checkout_id text,
  
  -- Status
  status text DEFAULT 'pending',  -- pending, processing, completed, failed
  
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);
```

#### 5. **escrow_disputes** - Dispute Records
```sql
CREATE TABLE public.escrow_disputes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.escrow_milestones(id),
  
  -- Dispute details
  raised_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  description text,
  evidence jsonb DEFAULT '[]',  -- Array of documents/screenshots
  
  -- Resolution
  status text DEFAULT 'open',  -- open, under_review, resolved, escalated
  resolution text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  
  -- Outcome
  outcome text,  -- buyer_wins, seller_wins, split, cancelled
  buyer_refund_amount numeric DEFAULT 0,
  seller_payout_amount numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## 🔌 API Endpoints

### 1. Create Escrow
**POST** `/api/escrow/create`

```typescript
{
  title: "Website Development Project",
  description: "Build e-commerce website with payment integration",
  escrow_type: "milestone",
  total_amount: 50000,
  currency: "KES",
  buyer_phone: "0712345678",
  seller_phone: "0723456789",
  arbitrator_phone: "0734567890",
  requires_multi_sig: true,
  required_signatures: 2,
  lock_days: 0,
  auto_release_days: 14,
  milestones: [
    {
      title: "Design Phase",
      amount: 15000,
      description: "UI/UX design and mockups",
      due_date: "2025-04-01"
    },
    {
      title: "Development Phase",
      amount: 25000,
      description: "Build all features and integrations",
      due_date: "2025-05-01"
    },
    {
      title: "Launch & Support",
      amount: 10000,
      description: "Deploy to production and 1-month support",
      due_date: "2025-06-01"
    }
  ],
  release_conditions: [
    "Design approved by buyer",
    "All features working as specified",
    "Website live on custom domain",
    "1-month bug-free operation"
  ]
}
```

**Response**:
```typescript
{
  success: true,
  escrow_id: "uuid",
  escrow_pocket_id: "escrow_abc123",
  status: "pending_funding",
  message: "Escrow created. Buyer can now fund the escrow."
}
```

### 2. Fund Escrow
**POST** `/api/escrow/fund`

```typescript
{
  escrow_id: "uuid",
  amount: 50000,
  phone_number: "0712345678"
}
```

**Response**:
```typescript
{
  success: true,
  checkout_request_id: "ws_CO_xxx",
  message: "STK push sent. Please enter your M-Pesa PIN."
}
```

### 3. Release Funds
**POST** `/api/escrow/release`

```typescript
{
  escrow_id: "uuid",
  milestone_id: "uuid",  // Optional: for milestone-based
  amount: 15000,  // Optional: for partial release
  release_to: "seller"  // or "buyer" for refund
}
```

**Response**:
```typescript
{
  success: true,
  transaction_id: "uuid",
  mpesa_transaction_id: "QGX123ABC",
  amount: 15000,
  recipient: "0723456789",
  message: "Funds released successfully"
}
```

### 4. Raise Dispute
**POST** `/api/escrow/dispute`

```typescript
{
  escrow_id: "uuid",
  milestone_id: "uuid",  // Optional
  reason: "Work not completed as agreed",
  description: "The website is missing key features that were specified in the contract...",
  evidence: [
    {
      type: "screenshot",
      url: "https://storage.supabase.co/evidence/screenshot1.png",
      description: "Missing checkout feature"
    },
    {
      type: "document",
      url: "https://storage.supabase.co/evidence/contract.pdf",
      description: "Original contract showing requirements"
    }
  ]
}
```

**Response**:
```typescript
{
  success: true,
  dispute_id: "uuid",
  status: "open",
  arbitrator_notified: true,
  message: "Dispute raised. Arbitrator will review within 48 hours."
}
```

### 5. Resolve Dispute (Arbitrator Only)
**POST** `/api/escrow/resolve-dispute`

```typescript
{
  dispute_id: "uuid",
  outcome: "split",  // buyer_wins, seller_wins, split, cancelled
  buyer_refund_amount: 20000,
  seller_payout_amount: 30000,
  resolution: "After reviewing evidence, seller completed 60% of work. Splitting funds accordingly."
}
```

---

## 💡 Usage Examples

### Example 1: Freelance Website Development

```typescript
// BUYER: Create escrow for website project
const escrow = await fetch('/api/escrow/create', {
  method: 'POST',
  body: JSON.stringify({
    title: "E-commerce Website",
    escrow_type: "milestone",
    total_amount: 50000,
    seller_phone: "0723456789",
    milestones: [
      { title: "Design", amount: 15000 },
      { title: "Development", amount: 25000 },
      { title: "Launch", amount: 10000 }
    ]
  })
});

// BUYER: Fund the escrow
await fetch('/api/escrow/fund', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: escrow.escrow_id,
    amount: 50000,
    phone_number: "0712345678"
  })
});
// → STK push sent, buyer enters PIN, funds locked in escrow

// SELLER: Complete design phase, submit for approval
// (Uploads design files, screenshots, etc.)

// BUYER: Approve design milestone
await fetch('/api/escrow/release', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: escrow.escrow_id,
    milestone_id: "milestone_1_uuid",
    amount: 15000
  })
});
// → KES 15,000 released to seller's M-Pesa

// Repeat for remaining milestones...
```

### Example 2: Product Purchase with Arbitrator

```typescript
// BUYER: Create two-party escrow for laptop purchase
const laptopEscrow = await fetch('/api/escrow/create', {
  method: 'POST',
  body: JSON.stringify({
    title: "MacBook Pro Purchase",
    escrow_type: "two_party",
    total_amount: 120000,
    seller_phone: "0723456789",
    arbitrator_phone: "0734567890",  // Trusted third party
    requires_multi_sig: true,
    required_signatures: 2,
    auto_release_days: 7  // Auto-release after 7 days if no dispute
  })
});

// BUYER: Fund escrow
await fetch('/api/escrow/fund', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: laptopEscrow.escrow_id,
    amount: 120000
  })
});

// SELLER: Ships laptop, provides tracking number

// BUYER: Receives laptop
// Option 1: Satisfied → Release funds
await fetch('/api/escrow/release', {
  method: 'POST',
  body: JSON.stringify({ escrow_id: laptopEscrow.escrow_id })
});

// Option 2: Issue found → Raise dispute
await fetch('/api/escrow/dispute', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: laptopEscrow.escrow_id,
    reason: "Laptop has defects",
    evidence: [/* photos of defects */]
  })
});

// ARBITRATOR: Reviews evidence, makes decision
await fetch('/api/escrow/resolve-dispute', {
  method: 'POST',
  body: JSON.stringify({
    dispute_id: "dispute_uuid",
    outcome: "buyer_wins",  // Full refund to buyer
    buyer_refund_amount: 120000
  })
});
```

### Example 3: Rental Deposit (Time-Locked)

```typescript
// TENANT: Create time-locked escrow for rental deposit
const deposit = await fetch('/api/escrow/create', {
  method: 'POST',
  body: JSON.stringify({
    title: "Apartment Rental Deposit",
    escrow_type: "time_locked",
    total_amount: 30000,
    seller_phone: "0723456789",  // Landlord
    lock_days: 365,  // Locked for 1 year
    auto_release_days: 7  // Auto-release 7 days after lock expires
  })
});

// TENANT: Fund deposit
await fetch('/api/escrow/fund', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: deposit.escrow_id,
    amount: 30000
  })
});

// After 1 year lease ends:
// Option 1: No damages → Auto-release to tenant
// Option 2: Damages found → Landlord raises dispute
await fetch('/api/escrow/dispute', {
  method: 'POST',
  body: JSON.stringify({
    escrow_id: deposit.escrow_id,
    reason: "Property damages",
    evidence: [/* photos of damages */]
  })
});
```

---

## 🔐 Security Features

### 1. **Multi-Signature Protection**
- Requires multiple approvals before fund release
- Prevents single-party fraud
- Configurable signature thresholds (2-of-3, 3-of-5, etc.)
- All signatures logged with timestamps

### 2. **Time-Lock Safety**
- Funds cannot be released before lock expiry
- Prevents premature withdrawals
- Automatic release after deadline (if no dispute)
- Protects both parties from hasty decisions

### 3. **Arbitrator System**
- Neutral third party for dispute resolution
- Access to all evidence from both parties
- Binding decision on fund distribution
- Reputation system for arbitrators

### 4. **Audit Trail**
- Complete transaction history
- All actions logged with user IDs and timestamps
- Evidence storage with version control
- Immutable record for legal purposes

### 5. **Pocket Isolation**
- Each escrow gets dedicated Gate pocket
- Funds isolated from other escrows
- Real-time balance tracking
- Automatic reconciliation

---

## 📊 Analytics & Reporting

### Buyer Dashboard
- Active escrows
- Total funds in escrow
- Pending approvals
- Dispute history
- Completed transactions

### Seller Dashboard
- Pending releases
- Total earnings in escrow
- Milestone completion rate
- Average release time
- Buyer ratings

### Arbitrator Dashboard
- Open disputes
- Resolution history
- Average resolution time
- Decision outcomes
- Reputation score

---

## 🚀 Getting Started

### 1. Access Escrow Page
Navigate to `/escrow` in your Ongea Pesa app

### 2. Create New Escrow
Click "New Escrow" and select type:
- Two-Party (simple buyer-seller)
- Multi-Party (group funding)
- Milestone-Based (progressive releases)
- Time-Locked (deadline-based)

### 3. Configure Terms
Set up escrow parameters:
- Total amount
- Parties involved (buyer, seller, arbitrator)
- Safety features (multi-sig, time-lock)
- Release conditions
- Milestones (if applicable)

### 4. Fund Escrow
Buyer funds via M-Pesa STK push:
- Enter amount
- Confirm phone number
- Enter M-Pesa PIN
- Funds locked in escrow pocket

### 5. Track Progress
Monitor escrow status:
- Funding status
- Milestone completion
- Approval requests
- Dispute notifications

---

## 🎯 Best Practices

### For Buyers
1. **Clear Requirements**: Define deliverables explicitly
2. **Use Milestones**: Break large projects into stages
3. **Add Arbitrator**: Include trusted third party for high-value transactions
4. **Document Everything**: Keep records of all communications
5. **Review Promptly**: Approve/dispute milestones quickly

### For Sellers
1. **Understand Terms**: Read all conditions before accepting
2. **Submit Evidence**: Provide proof of delivery for each milestone
3. **Communicate**: Keep buyer updated on progress
4. **Meet Deadlines**: Complete work within agreed timeframes
5. **Quality Delivery**: Ensure work meets specifications

### For Arbitrators
1. **Stay Neutral**: No bias toward either party
2. **Review Thoroughly**: Examine all evidence carefully
3. **Communicate Clearly**: Explain decisions with reasoning
4. **Act Quickly**: Resolve disputes within 48-72 hours
5. **Document Decisions**: Provide written resolution

---

## 🔧 Troubleshooting

### Escrow Not Funded
- Check buyer has sufficient M-Pesa balance
- Verify correct phone number
- Ensure STK push not expired (2 minutes)
- Retry funding with new STK push

### Release Delayed
- Verify all required signatures collected
- Check time-lock hasn't expired yet
- Ensure no active disputes
- Contact arbitrator if stuck

### Dispute Not Resolved
- Ensure all evidence submitted
- Check arbitrator has been notified
- Allow 48-72 hours for review
- Escalate to platform support if needed

---

## 📞 Support

For Escrow-specific support:
- **Documentation**: [ESCROW_README.md](ESCROW_README.md)
- **Main Platform**: [README.md](README.md)
- **Email**: escrow-support@ongeapesa.com

---

**Built with ❤️ in Nairobi, Kenya** 🇰🇪

**Ongea Pesa Escrow** — *Trust Through Technology*

# Escrow & Chama Collection System

## Overview

Ongea Pesa now includes two powerful group financial features:

1. **Escrow Protection** - Secure transactions with crypto-grade safety features
2. **Chama Collect** - Group savings with rotating payouts (traditional African savings groups)

---

## 🔒 Escrow System

### What is Escrow?

Escrow is a financial arrangement where a third party holds funds until predetermined conditions are met. Our system implements crypto-grade safety features:

### Safety Features

| Feature | Description |
|---------|-------------|
| **Time-Lock** | Funds locked until specific date/time |
| **Multi-Signature** | Requires 2-of-3 or custom approvals |
| **Milestone Releases** | Partial releases as work progresses |
| **Dispute Resolution** | Built-in arbitration system |
| **Auto-Release** | Automatic release if no dispute raised |

### Escrow Types

1. **Two-Party** - Simple buyer-seller with optional arbitrator
2. **Multi-Party** - Multiple contributors funding one escrow
3. **Milestone-Based** - Release funds in stages
4. **Time-Locked** - Funds locked until specific date

### How It Works

```
1. CREATE → Buyer creates escrow with terms
2. FUND → Buyer deposits funds via M-Pesa STK
3. WORK → Seller delivers goods/services
4. RELEASE → Buyer approves, funds released to seller
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/escrow/create` | POST | Create new escrow |
| `/api/escrow/fund` | POST | Fund escrow via STK push |
| `/api/escrow/release` | POST | Release funds to seller |
| `/api/escrow/dispute` | POST | Raise a dispute |

### Example: Create Escrow

```javascript
const response = await fetch('/api/escrow/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Website Development',
    description: 'Build e-commerce website',
    escrow_type: 'milestone',
    total_amount: 50000,
    currency: 'KES',
    buyer_phone: '0712345678',
    seller_phone: '0723456789',
    arbitrator_phone: '0734567890',
    requires_multi_sig: true,
    required_signatures: 2,
    lock_days: 0,
    auto_release_days: 14,
    milestones: [
      { title: 'Design', amount: '15000', description: 'UI/UX design' },
      { title: 'Development', amount: '25000', description: 'Build features' },
      { title: 'Launch', amount: '10000', description: 'Deploy & support' }
    ],
    release_conditions: [
      'Design approved by buyer',
      'All features working',
      'Website live on domain'
    ]
  })
});
```

---

## 🏦 Chama Collection System

### What is a Chama?

A Chama is a traditional African savings group where members contribute a fixed amount regularly. The pooled funds are given to one member at a time on a rotating basis.

### Key Features

- **Bulk STK Push** - Send payment requests to all members at once
- **Real-time Tracking** - Monitor who has paid
- **Auto Retry** - Follow-up on failed payments
- **Flexible Rotation** - Sequential, random, or needs-based
- **Scheduled Collections** - Weekly, bi-weekly, monthly

### How It Works

```
1. CREATE CHAMA → Set contribution amount & frequency
2. ADD MEMBERS → Invite members with phone numbers
3. START COLLECTION → Send STK push to ALL members
4. TRACK PAYMENTS → Poll status, retry failed ones
5. DISTRIBUTE → Send collected funds to rotating recipient
```

### Collection Flow (30 Members Example)

```
┌─────────────────────────────────────────────────────────┐
│                    START COLLECTION                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Send 30 STK Push Requests (one per member)             │
│  - Each member gets M-Pesa prompt on phone              │
│  - 500ms delay between each to avoid rate limiting      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Poll Status Every 5 Seconds                            │
│  - Check IndexPay settlements API                       │
│  - Match payments to members by account_number/phone    │
│  - Update: completed / pending / failed                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Handle Failed Payments                                  │
│  - Retry STK for failed members (up to 3 attempts)      │
│  - Send reminders to pending members                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Distribute When Complete                                │
│  - All members paid OR grace period expired             │
│  - Send total to rotating recipient via B2C             │
│  - Advance to next cycle & next recipient               │
└─────────────────────────────────────────────────────────┘
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chama/create` | POST | Create new chama |
| `/api/chama/add-member` | POST | Add member to chama |
| `/api/chama/start-collection` | POST | Send STK to all members |
| `/api/chama/poll-stk` | GET | Check payment status |
| `/api/chama/retry-stk` | POST | Retry failed payment |
| `/api/chama/distribute` | POST | Send funds to recipient |
| `/api/chama/shuffle-rotation` | POST | Randomize rotation order |

### Example: Create Chama

```javascript
const response = await fetch('/api/chama/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Office Savings Group',
    description: 'Monthly savings for office colleagues',
    contribution_amount: 5000,
    currency: 'KES',
    collection_frequency: 'monthly',
    collection_day: 25, // 25th of each month
    rotation_type: 'sequential',
    total_cycles: 12, // 12 months
    late_fee_percentage: 5,
    grace_period_hours: 48,
    allow_partial_payments: false,
    require_all_before_payout: true,
    members: [
      { name: 'John Doe', phone: '0712345678', email: 'john@email.com' },
      { name: 'Jane Smith', phone: '0723456789', email: 'jane@email.com' },
      { name: 'Bob Wilson', phone: '0734567890', email: 'bob@email.com' }
    ]
  })
});
```

### Example: Start Collection

```javascript
// Start collection - sends STK to all members
const response = await fetch('/api/chama/start-collection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chama_id: 'uuid-of-chama'
  })
});

// Response includes:
// - cycle_id: for tracking
// - stk_sent: number of successful STK pushes
// - stk_failed: number of failed pushes
// - results: detailed status per member
```

### Example: Poll & Retry

```javascript
// Poll status
const status = await fetch(`/api/chama/poll-stk?cycle_id=${cycleId}`);
const data = await status.json();

// Check results
console.log(`Completed: ${data.completed}/${data.total_members}`);
console.log(`Collected: KES ${data.collected_amount}`);

// Retry failed member
if (data.failed > 0) {
  await fetch('/api/chama/retry-stk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cycle_id: cycleId,
      member_id: failedMemberId
    })
  });
}
```

---

## Database Schema

### Escrow Tables

- `escrows` - Main escrow contracts
- `escrow_participants` - Parties involved
- `escrow_milestones` - Milestone-based releases
- `escrow_transactions` - Funding, releases, refunds
- `escrow_disputes` - Dispute records

### Chama Tables

- `chamas` - Main chama groups
- `chama_members` - Group members
- `chama_projects` - Goals within a chama
- `chama_cycles` - Collection cycles
- `chama_stk_requests` - Individual STK tracking
- `chama_payouts` - Distribution records

---

## Testing

### Test Escrow Flow

1. Go to `/escrow` page
2. Click "New Escrow"
3. Fill in details:
   - Title: "Test Escrow"
   - Amount: 1000
   - Type: Two-Party
   - Add buyer/seller phones
4. Create escrow
5. Fund via STK push
6. Release funds

### Test Chama Flow

1. Go to `/chama` page
2. Click "New Chama"
3. Fill in details:
   - Name: "Test Chama"
   - Contribution: 500
   - Frequency: Weekly
4. Add 3+ members with real phone numbers
5. Start Collection
6. Watch STK pushes go out
7. Poll status
8. Distribute when complete

---

## Security Considerations

### Escrow Security

- Multi-signature prevents single-party fraud
- Time-locks prevent premature withdrawals
- Arbitrator can resolve disputes fairly
- All transactions logged and auditable

### Chama Security

- Only admin can start collections
- STK push requires user PIN confirmation
- Automatic retry limits prevent spam
- Full audit trail of all payments

---

## Integration with Gate/Pockets

Both systems integrate with the existing Gate wallet infrastructure:

- **Escrow Pockets**: Each escrow gets a dedicated pocket (`escrow_{id}`)
- **Chama Pockets**: Each chama gets a dedicated pocket (`chama_{id}`)
- Funds are held securely until release conditions are met
- All M-Pesa transactions go through IndexPay API

---

## Pages

- `/escrow` - Escrow management page
- `/chama` - Chama collection page

Both pages are accessible from the main navigation.

# Chama & Escrow System Documentation

## Overview

Ongea Pesa provides two powerful financial group management features: **Chama** (Group Savings & Collections) and **Escrow** (Secure Transaction Protection). These features enable communities, businesses, and individuals to manage collective finances with transparency, security, and automation.

---

# CHAMA (Group Savings & Collections)

## What is a Chama?

A **Chama** is a traditional East African concept of community-based savings groups where members pool money together for collective benefit. Ongea Pesa digitizes this concept, making it easier to manage, track, and automate group financial activities.

## Chama Types

### 1. Savings Chama (Merry-Go-Round)
**Description:** Traditional rotating savings where members contribute a fixed amount regularly, and one member receives the entire pool each cycle.

**How it Works:**
1. Members agree on a contribution amount (e.g., KES 1,000)
2. All members contribute each cycle (weekly/monthly)
3. One member receives the total collected amount
4. Rotation continues until everyone has received

**Example:**
- 10 members, KES 1,000 each
- Each month, pool = KES 10,000
- Month 1: Member A receives KES 10,000
- Month 2: Member B receives KES 10,000
- ... continues until Month 10

**Use Cases:**
- School fees savings
- Emergency fund building
- Asset acquisition (furniture, electronics)
- Wedding/ceremony funding

### 2. Collection Chama
**Description:** Fixed group collection where funds are pooled for a specific shared purpose without rotation.

**How it Works:**
1. Creator sets contribution amount and frequency
2. All members contribute to a shared pool
3. Funds are used for agreed group expenses
4. Transparent tracking of all contributions

**Use Cases:**
- Group business investments
- Community projects (water tank, fence)
- Funeral/emergency funds
- Group travel/trips

### 3. Fundraising Chama
**Description:** Pledge-based contributions where members commit to flexible amounts toward a goal.

**How it Works:**
1. Creator sets a fundraising goal and description
2. Members pledge their commitment amounts
3. Members can fund their pledges anytime
4. Progress tracking toward the goal

**Use Cases:**
- Medical bill fundraising
- Education sponsorship
- Charity drives
- Business startup capital
- Wedding contributions (Harambee)

## Chama Features

### Member Management
- **Add Members:** Search existing Ongea Pesa users or add by phone number
- **Bulk Addition:** Upload CSV file with member list
- **Invite Links:** Generate shareable links for self-registration
- **Role Assignment:** Admin (creator) and member roles
- **Exit Requests:** Members can request to leave, admin approves

### Collection Automation
- **Scheduled Collections:** Set frequency (daily, weekly, bi-weekly, monthly)
- **STK Push:** Automatic M-Pesa payment prompts to all members
- **Real-time Tracking:** Monitor who has paid, pending, failed
- **Rotation Management:** Automatic or random recipient selection

### Transparency & Tracking
- **Contribution History:** Full record of all payments
- **Member Standings:** Who has contributed, who is behind
- **Cycle Reports:** Per-cycle financial summaries
- **Payout Tracking:** Who has received, who is pending

## How to Create a Chama

1. **Navigate to Chama Page** (`/chama`)
2. **Click "Create Chama"**
3. **Step 1 - Details:**
   - Enter name and description
   - Select chama type (Savings/Collection/Fundraising)
4. **Step 2 - Settings:**
   - Set contribution amount (or leave flexible for fundraising)
   - Choose frequency (Daily/Weekly/Bi-Weekly/Monthly)
   - Set collection day (e.g., 25th of month)
   - Choose rotation type (Sequential/Random)
5. **Step 3 - Members:**
   - Search and add Ongea Pesa users
   - Enter phone numbers manually
   - Upload CSV file for bulk addition
   - Set pledge amounts for fundraising
6. **Submit** - Chama is created and active

## Public Invite Links

Generate shareable links for people to join your chama:

1. Open your chama details
2. Click **"Invite"** button
3. Link is copied to clipboard
4. Share via WhatsApp, SMS, email

**What recipients see:**
- Chama details (name, type, contribution amount)
- Form to enter their details
- Option to pledge (for fundraising)
- Option to pay immediately via M-Pesa

---

# ESCROW (Secure Transaction Protection)

## What is Escrow?

**Escrow** is a financial arrangement where a third party holds and regulates payment of funds on behalf of two or more parties in a transaction. Ongea Pesa provides digital escrow services to protect both buyers and sellers in transactions.

## Why Use Escrow?

- **Buyer Protection:** Payment is held until goods/services are delivered
- **Seller Assurance:** Guaranteed payment once delivery is confirmed
- **Dispute Resolution:** Platform mediates if issues arise
- **Fraud Prevention:** Reduces risk of scams in online transactions
- **Trust Building:** Enables transactions between strangers

## Escrow Types

### 1. Two-Party Escrow
**Description:** Simple buyer-seller transaction protection.

**How it Works:**
1. Buyer initiates escrow with agreed amount
2. Buyer deposits funds into escrow
3. Seller delivers goods/services
4. Buyer confirms delivery
5. Funds are released to seller

**Use Cases:**
- Online marketplace purchases
- Freelance work payments
- Used item sales
- Service contracts

### 2. Multi-Party Escrow
**Description:** Transactions involving multiple participants with signature requirements.

**How it Works:**
1. Creator defines participants and their roles
2. Funds are deposited
3. Multiple parties must sign/approve for release
4. Configurable signature threshold (e.g., 2 of 3)

**Use Cases:**
- Group property purchases
- Business partnership investments
- Contractor payments with multiple stakeholders
- Inheritance distributions

### 3. Milestone-Based Escrow
**Description:** Large projects with phased payments tied to deliverables.

**How it Works:**
1. Define project milestones with amounts
2. Full project amount is deposited
3. Funds released per milestone completion
4. Each milestone requires confirmation

**Example:**
- Website development: KES 100,000 total
  - Milestone 1: Design mockups (KES 20,000)
  - Milestone 2: Frontend development (KES 30,000)
  - Milestone 3: Backend & testing (KES 30,000)
  - Milestone 4: Deployment & handover (KES 20,000)

**Use Cases:**
- Software development projects
- Construction projects
- Event planning
- Marketing campaigns

### 4. Time-Locked Escrow
**Description:** Funds are automatically released after a specified time period.

**How it Works:**
1. Set lock duration (days/weeks/months)
2. Deposit funds
3. Funds are locked until time expires
4. Optional auto-release or manual confirmation

**Use Cases:**
- Subscription payments
- Rental deposits
- Investment maturity
- Savings goals

## Escrow Security Features

### Multi-Signature
- Require multiple parties to approve releases
- Configurable threshold (e.g., 2 of 3 signers)
- Each participant has unique confirmation

### Time Locks
- Funds cannot be accessed before lock expires
- Prevents hasty or fraudulent releases
- Optional extension capabilities

### Dispute Handling
- Either party can raise a dispute
- Platform admin reviews evidence
- Fair resolution based on documentation

### Transaction Logging
- Every action is recorded with timestamps
- Immutable audit trail
- Full transparency for all parties

## How to Create an Escrow

1. **Navigate to Escrow Page** (`/escrow`)
2. **Click "Create Escrow"**
3. **Step 1 - Details:**
   - Enter title and description
   - Set total amount
   - Select escrow type
4. **Step 2 - Security:**
   - Enable multi-signature (optional)
   - Set required signatures count
   - Set time lock (optional)
   - Configure auto-release
5. **Step 3 - Participants:**
   - Add participants (buyer, seller, arbitrator)
   - Assign roles
   - Set contribution amounts per participant
6. **Step 4 - Milestones (if applicable):**
   - Define milestones with descriptions
   - Set amounts per milestone
   - Set due dates
7. **Submit** - Escrow is created

## Escrow Statuses

| Status | Description |
|--------|-------------|
| **Draft** | Escrow created but not yet funded |
| **Pending Funding** | Waiting for participants to deposit |
| **Funded** | All funds deposited, transaction active |
| **In Progress** | Milestones being completed |
| **Pending Release** | Awaiting confirmation to release |
| **Completed** | Funds released, transaction finished |
| **Disputed** | Issue raised, under review |
| **Cancelled** | Escrow cancelled, funds returned |

---

# Admin Observation

## Admin Escrow Monitor (`/admin-analytics/escrows`)

Platform administrators can observe all escrows:

- **Summary Statistics:** Total escrows, active, pending, completed, disputed
- **Financial Overview:** Total value, funded, released amounts
- **Status Breakdown:** Visual charts of escrow statuses
- **Type Distribution:** Two-party vs Multi-party vs Milestone vs Time-locked
- **Detailed View:** Full escrow details with participants and milestones
- **Read-only Access:** Admins observe but don't interfere

## Admin Chama Monitor (`/admin-analytics/chamas`)

Platform administrators can observe all chamas:

- **Summary Statistics:** Total chamas, active, paused, completed
- **Financial Overview:** Total collected, distributed, pending
- **Type Breakdown:** Savings vs Collection vs Fundraising
- **Frequency Distribution:** Daily, weekly, bi-weekly, monthly
- **Member Analytics:** Total members across all chamas
- **Detailed View:** Full chama details with members and cycles

---

# API Reference

## Chama Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chama/create` | POST | Create a new chama |
| `/api/chama/add-member` | POST | Add single member |
| `/api/chama/add-members-bulk` | POST | Add multiple members |
| `/api/chama/start-collection` | POST | Trigger STK push to all members |
| `/api/chama/poll-stk` | GET | Check collection progress |

## Escrow Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/escrow/create` | POST | Create new escrow |
| `/api/escrow/fund` | POST | Deposit funds to escrow |
| `/api/escrow/release` | POST | Release funds to recipient |
| `/api/escrow/sign` | POST | Add signature for multi-sig |
| `/api/escrow/dispute` | POST | Raise a dispute |

---

# IndexPay Gate & Pocket Integration

## Automatic Wallet Creation

When you create a Chama or Escrow, the system automatically:
1. **Creates an IndexPay Gate** - A dedicated wallet for the group
2. **Creates a Pocket** - A sub-wallet within the gate for transactions
3. **Links to the entity** - Gate/pocket IDs stored in database

This enables:
- **Automatic deposits** via M-Pesa STK push directly to the group wallet
- **Automatic balance tracking** - Real-time balance updates
- **Secure payouts** - Funds disbursed from the group wallet
- **Complete audit trail** - All transactions logged

## How Funds Flow

### Chama Fund Flow
```
Member Phone → STK Push → Chama Gate → Member Balance Updated → Payout to Recipient
```

### Escrow Fund Flow
```
Buyer Phone → STK Push → Escrow Gate → Funded Amount Updated → Release to Seller
```

## Gate Naming Convention
- **Chamas**: `op_chama_{name}_{id}` (e.g., `op_chama_officesavings_abc123`)
- **Escrows**: `op_escrow_{title}_{id}` (e.g., `op_escrow_laptoppurchase_xyz789`)

---

# Database Schema

## Chama Tables

### `chamas`
- `id` - Unique identifier
- `name` - Chama name
- `description` - Purpose/description
- `creator_id` - Creator's user ID
- `chama_type` - savings/collection/fundraising
- `contribution_amount` - Amount per member
- `collection_frequency` - daily/weekly/biweekly/monthly
- `status` - active/paused/completed
- `total_collected` - Sum of all contributions
- `total_distributed` - Sum of all payouts
- `gate_id` - IndexPay Gate ID (auto-created)
- `gate_name` - IndexPay Gate name
- `pocket_id` - IndexPay Pocket ID
- `pocket_name` - Pocket name
- `gate_balance` - Current gate balance (auto-updated)

### `chama_members`
- `id` - Unique identifier
- `chama_id` - Reference to chama
- `user_id` - Ongea Pesa user (if registered)
- `name` - Member name
- `phone_number` - M-Pesa number
- `role` - admin/member
- `rotation_position` - Position in rotation
- `total_contributed` - Member's total contributions
- `pledge_amount` - Pledged amount (fundraising)

### `chama_cycles`
- `id` - Unique identifier
- `chama_id` - Reference to chama
- `cycle_number` - Cycle sequence
- `recipient_id` - Who receives this cycle
- `total_collected` - Amount collected
- `status` - pending/in_progress/completed

## Escrow Tables

### `escrows`
- `id` - Unique identifier
- `title` - Transaction title
- `description` - Transaction details
- `creator_id` - Creator's user ID
- `escrow_type` - two_party/multi_party/milestone/time_locked
- `total_amount` - Total escrow value
- `funded_amount` - Deposited amount
- `released_amount` - Released amount
- `status` - draft/pending_funding/funded/completed/disputed
- `requires_multi_sig` - Multi-signature enabled
- `required_signatures` - Signatures needed
- `lock_until` - Time lock expiry
- `gate_id` - IndexPay Gate ID (auto-created)
- `gate_name` - IndexPay Gate name
- `pocket_id` - IndexPay Pocket ID
- `pocket_name` - Pocket name
- `gate_balance` - Current gate balance (auto-updated)

### `gate_transactions`
- `id` - Unique identifier
- `entity_type` - chama/escrow
- `entity_id` - Reference to chama or escrow
- `gate_id` - IndexPay Gate ID
- `transaction_type` - deposit/withdrawal/stk_push/payout
- `amount` - Transaction amount
- `status` - pending/completed/failed
- `mpesa_receipt` - M-Pesa receipt number
- `phone_number` - Phone involved
- `created_at` - Transaction timestamp

### `escrow_participants`
- `id` - Unique identifier
- `escrow_id` - Reference to escrow
- `user_id` - Participant's user ID
- `role` - buyer/seller/arbitrator
- `contribution_amount` - Their contribution
- `has_signed` - Signature status

### `escrow_milestones`
- `id` - Unique identifier
- `escrow_id` - Reference to escrow
- `title` - Milestone name
- `description` - Milestone details
- `amount` - Milestone value
- `status` - pending/completed
- `due_date` - Expected completion

---

# Best Practices

## For Chama Creators
1. **Clear Rules:** Define contribution amounts and schedules upfront
2. **Reasonable Sizes:** Start with 5-15 members for manageability
3. **Regular Communication:** Use group chats alongside the app
4. **Grace Periods:** Allow reasonable time for late payments
5. **Documentation:** Keep records of all agreements

## For Escrow Users
1. **Detailed Descriptions:** Be specific about deliverables
2. **Milestone Clarity:** Define clear acceptance criteria
3. **Communication:** Keep all discussions documented
4. **Reasonable Timelines:** Set achievable deadlines
5. **Evidence:** Keep photos, screenshots, receipts

---

# FAQ

## Chama FAQ

**Q: Can I be in multiple chamas?**
A: Yes, you can join as many chamas as you want.

**Q: What happens if a member doesn't pay?**
A: Admin can track defaulters. The system shows pending payments clearly.

**Q: Can I leave a chama?**
A: Yes, request exit from the chama. Admin must approve.

**Q: How is the rotation order decided?**
A: Creator chooses sequential (join order) or random rotation.

## Escrow FAQ

**Q: What fees does escrow charge?**
A: Configurable fee percentage set by the escrow creator.

**Q: What if the seller doesn't deliver?**
A: Raise a dispute. Funds remain locked until resolution.

**Q: Can I cancel an escrow?**
A: Before funding, yes. After funding, requires agreement or dispute.

**Q: How long does dispute resolution take?**
A: Typically 3-7 business days depending on complexity.

---

# Support

For issues or questions:
- Email: support@ongeapesa.com
- WhatsApp: +254 XXX XXX XXX
- In-app: Use the Help section

---

*Last Updated: December 2024*
*Version: 1.0*

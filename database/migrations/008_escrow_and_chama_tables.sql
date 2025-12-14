-- =====================================================
-- ESCROW AND CHAMA COLLECTION SYSTEM
-- Advanced escrow with crypto-grade safety features
-- Chama (group savings) with rotating collections
-- =====================================================

-- =====================================================
-- ESCROW SYSTEM TABLES
-- =====================================================

-- Main escrow contracts table
CREATE TABLE public.escrows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Basic info
  title text NOT NULL,
  description text,
  escrow_type text NOT NULL CHECK (escrow_type IN ('two_party', 'multi_party', 'milestone', 'time_locked')),
  
  -- Parties involved
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  buyer_id uuid REFERENCES auth.users(id),
  seller_id uuid REFERENCES auth.users(id),
  arbitrator_id uuid REFERENCES auth.users(id), -- For dispute resolution
  
  -- Financial details
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  currency text DEFAULT 'KES',
  funded_amount numeric DEFAULT 0,
  released_amount numeric DEFAULT 0,
  fee_percentage numeric DEFAULT 1.5, -- Platform fee
  
  -- Pocket/Gate integration
  escrow_pocket_id text, -- Dedicated pocket for this escrow
  gate_name text,
  
  -- Status tracking
  status text DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Being created
    'pending_funding', -- Waiting for buyer to fund
    'funded',          -- Fully funded, work can begin
    'in_progress',     -- Work/delivery in progress
    'pending_release', -- Waiting for release approval
    'completed',       -- Successfully completed
    'disputed',        -- Under dispute
    'cancelled',       -- Cancelled by parties
    'refunded',        -- Funds returned to buyer
    'expired'          -- Time limit exceeded
  )),
  
  -- Safety features (crypto-grade)
  requires_multi_sig boolean DEFAULT false, -- Requires multiple approvals
  required_signatures integer DEFAULT 1,
  collected_signatures integer DEFAULT 0,
  
  -- Time-lock features
  lock_until timestamp with time zone, -- Funds locked until this time
  auto_release_at timestamp with time zone, -- Auto-release if no dispute
  expiry_date timestamp with time zone, -- Contract expiry
  
  -- Release conditions
  release_conditions jsonb DEFAULT '[]', -- Array of conditions to meet
  conditions_met jsonb DEFAULT '[]', -- Conditions that have been met
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  funded_at timestamp with time zone,
  completed_at timestamp with time zone,
  
  CONSTRAINT escrows_pkey PRIMARY KEY (id)
);

-- Escrow participants (for multi-party escrows)
CREATE TABLE public.escrow_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  
  role text NOT NULL CHECK (role IN ('buyer', 'seller', 'arbitrator', 'observer', 'signer')),
  
  -- Contribution tracking
  contribution_amount numeric DEFAULT 0,
  contribution_paid boolean DEFAULT false,
  
  -- Signature/approval tracking
  has_signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  signature_required boolean DEFAULT false,
  
  -- Contact info
  phone_number text,
  email text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'exit_requested', 'exited')),
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  exit_requested_at timestamp with time zone,
  exited_at timestamp with time zone,
  
  CONSTRAINT escrow_participants_pkey PRIMARY KEY (id),
  CONSTRAINT escrow_participants_unique UNIQUE (escrow_id, user_id)
);

-- Escrow milestones (for milestone-based releases)
CREATE TABLE public.escrow_milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  sequence_order integer NOT NULL,
  
  -- Amount for this milestone
  amount numeric NOT NULL CHECK (amount > 0),
  percentage numeric, -- Alternative: percentage of total
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Not started
    'in_progress', -- Work in progress
    'submitted',  -- Seller submitted for review
    'approved',   -- Buyer approved
    'released',   -- Funds released
    'disputed'    -- Under dispute
  )),
  
  -- Approval tracking
  submitted_at timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  released_at timestamp with time zone,
  
  -- Evidence/proof
  proof_documents jsonb DEFAULT '[]', -- URLs to proof documents
  notes text,
  
  -- Deadline
  due_date timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT escrow_milestones_pkey PRIMARY KEY (id)
);

-- Escrow transactions (funding, releases, refunds)
CREATE TABLE public.escrow_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.escrow_milestones(id),
  
  -- Transaction details
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'funding',      -- Money into escrow
    'release',      -- Money released to seller
    'refund',       -- Money returned to buyer
    'fee',          -- Platform fee deduction
    'dispute_hold', -- Funds held during dispute
    'arbitration'   -- Arbitrator decision payout
  )),
  
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  
  -- Payment tracking
  payment_method text, -- mpesa, wallet, bank
  external_ref text,
  mpesa_transaction_id text,
  stk_checkout_id text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Metadata
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT escrow_transactions_pkey PRIMARY KEY (id)
);

-- Escrow disputes
CREATE TABLE public.escrow_disputes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.escrow_milestones(id),
  
  -- Dispute details
  raised_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  description text,
  evidence jsonb DEFAULT '[]', -- Array of evidence documents/screenshots
  
  -- Resolution
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  resolution text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  
  -- Outcome
  outcome text CHECK (outcome IN ('buyer_wins', 'seller_wins', 'split', 'cancelled')),
  buyer_refund_amount numeric DEFAULT 0,
  seller_payout_amount numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT escrow_disputes_pkey PRIMARY KEY (id)
);

-- =====================================================
-- CHAMA (GROUP SAVINGS) SYSTEM TABLES
-- =====================================================

-- Main chama groups table
CREATE TABLE public.chamas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name text NOT NULL,
  description text,
  
  -- Chama type
  chama_type text DEFAULT 'savings' CHECK (chama_type IN ('savings', 'collection', 'fundraising')),
  
  -- Creator/Admin
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Pocket/Gate integration
  chama_pocket_id text, -- Dedicated pocket for chama funds
  gate_name text,
  
  -- Collection settings
  contribution_amount numeric DEFAULT 0 CHECK (contribution_amount >= 0), -- 0 for fundraising type
  currency text DEFAULT 'KES',
  collection_frequency text NOT NULL CHECK (collection_frequency IN (
    'daily', 'weekly', 'biweekly', 'monthly', 'custom'
  )),
  collection_day integer, -- Day of week (1-7) or day of month (1-31)
  custom_frequency_days integer, -- For custom frequency
  
  -- Rotation settings
  rotation_type text DEFAULT 'sequential' CHECK (rotation_type IN (
    'sequential',  -- Fixed order
    'random',      -- Random each cycle
    'bidding',     -- Members bid for position
    'needs_based'  -- Based on member requests
  )),
  current_rotation_index integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'dissolved')),
  
  -- Totals
  total_collected numeric DEFAULT 0,
  total_distributed numeric DEFAULT 0,
  current_cycle integer DEFAULT 1,
  total_cycles integer, -- NULL for indefinite
  
  -- Settings
  late_fee_percentage numeric DEFAULT 5,
  grace_period_hours integer DEFAULT 24,
  allow_partial_payments boolean DEFAULT true,
  require_all_before_payout boolean DEFAULT true, -- Wait for all members before payout
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  next_collection_date timestamp with time zone,
  next_payout_date timestamp with time zone,
  
  CONSTRAINT chamas_pkey PRIMARY KEY (id)
);

-- Chama members
CREATE TABLE public.chama_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id), -- NULL if not registered user
  
  -- Contact info (for non-registered users)
  name text NOT NULL,
  phone_number text NOT NULL,
  email text,
  
  -- Role
  role text DEFAULT 'member' CHECK (role IN ('admin', 'treasurer', 'secretary', 'member')),
  
  -- Rotation position
  rotation_position integer, -- Position in payout rotation
  has_received_payout boolean DEFAULT false,
  last_payout_date timestamp with time zone,
  next_payout_date timestamp with time zone,
  
  -- Contribution tracking
  total_contributed numeric DEFAULT 0,
  total_received numeric DEFAULT 0,
  pending_amount numeric DEFAULT 0, -- Amount owed
  
  -- Pledge amount (for fundraising type)
  pledge_amount numeric DEFAULT 0,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'removed', 'exit_requested', 'exited')),
  joined_at timestamp with time zone DEFAULT now(),
  exit_requested_at timestamp with time zone,
  exited_at timestamp with time zone,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT chama_members_pkey PRIMARY KEY (id),
  CONSTRAINT chama_members_unique_phone UNIQUE (chama_id, phone_number)
);

-- Chama projects (goals within a chama)
CREATE TABLE public.chama_projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  
  -- Project info
  name text NOT NULL,
  description text,
  
  -- Goal
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  collected_amount numeric DEFAULT 0,
  
  -- Timeline
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  -- Destination pocket
  destination_pocket_id text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT chama_projects_pkey PRIMARY KEY (id)
);

-- Chama collection cycles
CREATE TABLE public.chama_cycles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.chama_projects(id),
  
  -- Cycle info
  cycle_number integer NOT NULL,
  
  -- Collection period
  collection_start timestamp with time zone NOT NULL,
  collection_end timestamp with time zone NOT NULL,
  
  -- Recipient for this cycle
  recipient_member_id uuid REFERENCES public.chama_members(id),
  recipient_phone text,
  
  -- Amounts
  expected_amount numeric NOT NULL, -- contribution_amount * member_count
  collected_amount numeric DEFAULT 0,
  distributed_amount numeric DEFAULT 0,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not started
    'collecting',   -- STK pushes sent, collecting
    'collected',    -- All collected, ready for payout
    'distributing', -- Payout in progress
    'completed',    -- Cycle complete
    'failed'        -- Collection failed
  )),
  
  -- Tracking
  members_paid integer DEFAULT 0,
  members_pending integer DEFAULT 0,
  members_failed integer DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT chama_cycles_pkey PRIMARY KEY (id),
  CONSTRAINT chama_cycles_unique UNIQUE (chama_id, cycle_number)
);

-- Individual STK push tracking for chama collections
CREATE TABLE public.chama_stk_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.chama_cycles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id),
  
  -- STK details
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  
  -- External references
  checkout_request_id text,
  merchant_request_id text,
  account_number text, -- For verification
  mpesa_receipt_number text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',     -- Not sent yet
    'sent',        -- STK push sent
    'processing',  -- User entered PIN
    'completed',   -- Payment successful
    'failed',      -- Payment failed
    'cancelled',   -- User cancelled
    'expired'      -- STK expired
  )),
  
  -- Retry tracking
  attempt_count integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  last_attempt_at timestamp with time zone,
  next_retry_at timestamp with time zone,
  
  -- Error tracking
  error_code text,
  error_message text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT chama_stk_requests_pkey PRIMARY KEY (id)
);

-- Chama payouts (distributions to members)
CREATE TABLE public.chama_payouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.chama_cycles(id),
  member_id uuid NOT NULL REFERENCES public.chama_members(id),
  
  -- Payout details
  amount numeric NOT NULL,
  phone_number text NOT NULL,
  
  -- Payment tracking
  payment_method text DEFAULT 'mpesa', -- mpesa, bank, wallet
  external_ref text,
  mpesa_transaction_id text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Metadata
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT chama_payouts_pkey PRIMARY KEY (id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_escrows_creator ON public.escrows(creator_id);
CREATE INDEX idx_escrows_status ON public.escrows(status);
CREATE INDEX idx_escrows_buyer ON public.escrows(buyer_id);
CREATE INDEX idx_escrows_seller ON public.escrows(seller_id);

CREATE INDEX idx_escrow_participants_escrow ON public.escrow_participants(escrow_id);
CREATE INDEX idx_escrow_participants_user ON public.escrow_participants(user_id);

CREATE INDEX idx_escrow_milestones_escrow ON public.escrow_milestones(escrow_id);
CREATE INDEX idx_escrow_transactions_escrow ON public.escrow_transactions(escrow_id);
CREATE INDEX idx_escrow_disputes_escrow ON public.escrow_disputes(escrow_id);

CREATE INDEX idx_chamas_creator ON public.chamas(creator_id);
CREATE INDEX idx_chamas_status ON public.chamas(status);

CREATE INDEX idx_chama_members_chama ON public.chama_members(chama_id);
CREATE INDEX idx_chama_members_user ON public.chama_members(user_id);
CREATE INDEX idx_chama_members_phone ON public.chama_members(phone_number);

CREATE INDEX idx_chama_cycles_chama ON public.chama_cycles(chama_id);
CREATE INDEX idx_chama_cycles_status ON public.chama_cycles(status);

CREATE INDEX idx_chama_stk_requests_cycle ON public.chama_stk_requests(cycle_id);
CREATE INDEX idx_chama_stk_requests_member ON public.chama_stk_requests(member_id);
CREATE INDEX idx_chama_stk_requests_status ON public.chama_stk_requests(status);

CREATE INDEX idx_chama_payouts_cycle ON public.chama_payouts(cycle_id);
CREATE INDEX idx_chama_payouts_member ON public.chama_payouts(member_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_stk_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_payouts ENABLE ROW LEVEL SECURITY;

-- Escrow policies
CREATE POLICY "Users can view escrows they participate in" ON public.escrows
  FOR SELECT USING (
    auth.uid() = creator_id OR
    auth.uid() = buyer_id OR
    auth.uid() = seller_id OR
    auth.uid() = arbitrator_id OR
    EXISTS (SELECT 1 FROM public.escrow_participants WHERE escrow_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create escrows" ON public.escrows
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their escrows" ON public.escrows
  FOR UPDATE USING (auth.uid() = creator_id);

-- Chama policies
CREATE POLICY "Users can view chamas they are members of" ON public.chamas
  FOR SELECT USING (
    auth.uid() = creator_id OR
    EXISTS (SELECT 1 FROM public.chama_members WHERE chama_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create chamas" ON public.chamas
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can update their chamas" ON public.chamas
  FOR UPDATE USING (auth.uid() = creator_id);

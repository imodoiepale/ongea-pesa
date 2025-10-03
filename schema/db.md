# COMPLETE DATABASE SCHEMA FOR ONGEA PESA

Based on your transaction structure, here's the **production-ready database schema** with proper relationships, indexes, and security.

---

## FULL SQL SCHEMA

sql

```sql
-- Enable extensions
CREATE EXTENSION IFNOTEXISTS"uuid-ossp";
CREATE EXTENSION IFNOTEXISTS"pgcrypto";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATETABLEpublic.profiles (
  id UUID REFERENCES auth.users(id)ONDELETECASCADEPRIMARYKEY,
  phone_number TEXTUNIQUENOTNULL,
  mpesa_number TEXT,
  
-- Wallet & Balance
  wallet_balance DECIMAL(12,2)DEFAULT0.00CHECK(wallet_balance >=0),
  
-- Payment preferences
  mpesa_auto_topup BOOLEANDEFAULTfalse,
  mpesa_auto_topup_threshold DECIMAL(10,2)DEFAULT100.00,
  mpesa_auto_topup_amount DECIMAL(10,2)DEFAULT500.00,
  card_auto_topup BOOLEANDEFAULTfalse,
  default_payment_method TEXTDEFAULT'wallet'CHECK(default_payment_method IN('wallet','mpesa','card')),
  
-- Security
  pin_hash TEXT,
  biometric_enabled BOOLEANDEFAULTfalse,
  
-- Metadata
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  updated_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  last_login TIMESTAMPWITHTIME ZONE
);

-- ============================================
-- 2. TRANSACTIONS TABLE (your structure)
-- ============================================
CREATETABLEpublic.transactions(
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  
-- Transaction details (your exact structure)
typeTEXTNOTNULLCHECK(typeIN(
'send_phone',
'buy_goods_pochi',
'buy_goods_till',
'paybill',
'withdraw',
'bank_to_mpesa',
'mpesa_to_bank'
)),
  amount DECIMAL(12,2)NOTNULLCHECK(amount >0AND amount <=999999),
  
-- Recipient fields (empty strings when not used)
  phone TEXTDEFAULT'',
  till TEXTDEFAULT'',
  paybill TEXTDEFAULT'',
  account TEXTDEFAULT'',
  agent TEXTDEFAULT'',
  store TEXTDEFAULT'',
  bank_code TEXTDEFAULT'',
  
-- Status & verification
statusTEXTDEFAULT'pending'CHECK(statusIN(
'pending',
'processing',
'completed',
'failed',
'cancelled'
)),
  voice_verified BOOLEANDEFAULTfalse,
  confidence_score INTEGERCHECK(confidence_score >=0AND confidence_score <=100),
  voice_command_text TEXT,
  
-- External references
  mpesa_transaction_id TEXTDEFAULT'',
  external_ref TEXTDEFAULT'',
  
-- Error handling
  error_message TEXT,
  retry_count INTEGERDEFAULT0,
  
-- Timestamps
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  updated_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  completed_at TIMESTAMPWITHTIME ZONE
);

-- ============================================
-- 3. VOICE SESSIONS TABLE
-- ============================================
CREATETABLEpublic.voice_sessions (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  session_id TEXTUNIQUENOTNULL,
  agent_id TEXTNOTNULL,
  signed_url TEXT,
  
statusTEXTDEFAULT'active'CHECK(statusIN('active','expired','ended')),
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  expires_at TIMESTAMPWITHTIME ZONE DEFAULT(NOW()+INTERVAL'15 minutes'),
  ended_at TIMESTAMPWITHTIME ZONE
);

-- ============================================
-- 4. BALANCE HISTORY TABLE (audit trail)
-- ============================================
CREATETABLEpublic.balance_history (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  transaction_id UUID REFERENCEStransactions(id)ONDELETESETNULL,
  
  previous_balance DECIMAL(12,2)NOTNULL,
  new_balance DECIMAL(12,2)NOTNULL,
  change_amount DECIMAL(12,2)NOTNULL,
  reason TEXTNOTNULL,
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW()
);

-- ============================================
-- 5. MPESA TRANSACTIONS TABLE (for auto top-up)
-- ============================================
CREATETABLEpublic.mpesa_transactions (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  
-- M-Pesa details
  checkout_request_id TEXTUNIQUE,
  merchant_request_id TEXT,
  amount DECIMAL(10,2)NOTNULL,
  phone_number TEXTNOTNULL,
  mpesa_receipt_number TEXT,
  
statusTEXTDEFAULT'pending'CHECK(statusIN('pending','completed','failed')),
  error_message TEXT,
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  completed_at TIMESTAMPWITHTIME ZONE
);

-- ============================================
-- 6. SAVED PAYMENT METHODS TABLE
-- ============================================
CREATETABLEpublic.payment_methods (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  
  method_type TEXTNOTNULLCHECK(method_type IN('card','mpesa','bank')),
  
-- Card details (encrypted)
  card_last4 TEXT,
  card_brand TEXT,
  card_token TEXT,-- Stripe/Flutterwave token
  
-- M-Pesa details
  mpesa_number TEXT,
  
-- Bank details
  bank_name TEXT,
  bank_account_number TEXT,
  bank_code TEXT,
  
  is_default BOOLEANDEFAULTfalse,
  is_active BOOLEANDEFAULTtrue,
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW()
);

-- ============================================
-- 7. CONTACTS TABLE (frequent recipients)
-- ============================================
CREATETABLEpublic.contacts (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  
  name TEXTNOTNULL,
  phone_number TEXT,
  nickname TEXT,
  relationship TEXT,
  
-- Payment preferences for this contact
  default_amount DECIMAL(10,2),
  favorite BOOLEANDEFAULTfalse,
  
  transaction_count INTEGERDEFAULT0,
  total_sent DECIMAL(12,2)DEFAULT0,
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  updated_at TIMESTAMPWITHTIME ZONE DEFAULTNOW()
);

-- ============================================
-- 8. SUBSCRIPTIONS TABLE (revenue model)
-- ============================================
CREATETABLEpublic.subscriptions (
  id UUID PRIMARYKEYDEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id)ONDELETECASCADENOTNULL,
  
  plan_type TEXTNOTNULLCHECK(plan_type IN('free','basic','pro','business')),
statusTEXTDEFAULT'active'CHECK(statusIN('active','cancelled','expired','past_due')),
  
-- Pricing
  monthly_fee DECIMAL(10,2)NOTNULL,
  transaction_fee_percentage DECIMAL(5,4)NOTNULL,-- e.g., 0.0100 = 1%
  monthly_transaction_limit INTEGER,-- NULL = unlimited
  
-- Stripe/payment details
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
-- Billing
  current_period_start TIMESTAMPWITHTIME ZONE NOTNULL,
  current_period_end TIMESTAMPWITHTIME ZONE NOTNULL,
  cancel_at TIMESTAMPWITHTIME ZONE,
  
  created_at TIMESTAMPWITHTIME ZONE DEFAULTNOW(),
  updated_at TIMESTAMPWITHTIME ZONE DEFAULTNOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Transactions
CREATEINDEX idx_transactions_user_id ONtransactions(user_id);
CREATEINDEX idx_transactions_status ONtransactions(status);
CREATEINDEX idx_transactions_type ONtransactions(type);
CREATEINDEX idx_transactions_created_at ONtransactions(created_at DESC);
CREATEINDEX idx_transactions_user_status ONtransactions(user_id,status);

-- Voice sessions
CREATEINDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATEINDEX idx_voice_sessions_status ON voice_sessions(status);
CREATEINDEX idx_voice_sessions_expires_at ON voice_sessions(expires_at);

-- Balance history
CREATEINDEX idx_balance_history_user_id ON balance_history(user_id);
CREATEINDEX idx_balance_history_created_at ON balance_history(created_at DESC);

-- M-Pesa transactions
CREATEINDEX idx_mpesa_transactions_user_id ON mpesa_transactions(user_id);
CREATEINDEX idx_mpesa_transactions_status ON mpesa_transactions(status);
CREATEINDEX idx_mpesa_checkout_request ON mpesa_transactions(checkout_request_id);

-- Contacts
CREATEINDEX idx_contacts_user_id ON contacts(user_id);
CREATEINDEX idx_contacts_phone ON contacts(phone_number);
CREATEINDEX idx_contacts_favorite ON contacts(user_id, favorite)WHERE favorite =true;

-- Subscriptions
CREATEINDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATEINDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTERTABLE profiles ENABLEROWLEVEL SECURITY;
ALTERTABLEtransactionsENABLEROWLEVEL SECURITY;
ALTERTABLE voice_sessions ENABLEROWLEVEL SECURITY;
ALTERTABLE balance_history ENABLEROWLEVEL SECURITY;
ALTERTABLE mpesa_transactions ENABLEROWLEVEL SECURITY;
ALTERTABLE payment_methods ENABLEROWLEVEL SECURITY;
ALTERTABLE contacts ENABLEROWLEVEL SECURITY;
ALTERTABLE subscriptions ENABLEROWLEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON profiles FORSELECT
USING(auth.uid()= id);

CREATE POLICY "Users can update own profile"
ON profiles FORUPDATE
USING(auth.uid()= id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
ONtransactionsFORSELECT
USING(auth.uid()= user_id);

CREATE POLICY "Users can insert own transactions"
ONtransactionsFORINSERT
WITHCHECK(auth.uid()= user_id);

-- Voice sessions policies
CREATE POLICY "Users can view own sessions"
ON voice_sessions FORSELECT
USING(auth.uid()= user_id);

CREATE POLICY "Users can create own sessions"
ON voice_sessions FORINSERT
WITHCHECK(auth.uid()= user_id);

-- Balance history policies
CREATE POLICY "Users can view own balance history"
ON balance_history FORSELECT
USING(auth.uid()= user_id);

-- M-Pesa transactions policies
CREATE POLICY "Users can view own mpesa transactions"
ON mpesa_transactions FORSELECT
USING(auth.uid()= user_id);

-- Payment methods policies
CREATE POLICY "Users can manage own payment methods"
ON payment_methods FORALL
USING(auth.uid()= user_id);

-- Contacts policies
CREATE POLICY "Users can manage own contacts"
ON contacts FORALL
USING(auth.uid()= user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
ON subscriptions FORSELECT
USING(auth.uid()= user_id);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function: Update balance with history
CREATEORREPLACEFUNCTION update_user_balance(
  p_user_id UUID,
  p_transaction_id UUID,
  p_change_amount DECIMAL(12,2),
  p_reason TEXT
)RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
BEGIN
-- Lock row and get current balance
SELECT wallet_balance INTO v_current_balance
FROM profiles
WHERE id = p_user_id
FORUPDATE;
  
-- Calculate new balance
  v_new_balance := v_current_balance + p_change_amount;
  
-- Validate sufficient funds
IF v_new_balance <0THEN
    RAISE EXCEPTION 'Insufficient balance';
ENDIF;
  
-- Update balance
UPDATE profiles
SET wallet_balance = v_new_balance,
      updated_at =NOW()
WHERE id = p_user_id;
  
-- Create history record
INSERTINTO balance_history (
    user_id, transaction_id, previous_balance,
    new_balance, change_amount, reason
)VALUES(
    p_user_id, p_transaction_id, v_current_balance,
    v_new_balance, p_change_amount, p_reason
);
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update updated_at
CREATEORREPLACEFUNCTION update_updated_at_column()
RETURNSTRIGGERAS $$
BEGIN
  NEW.updated_at =NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATETRIGGER update_profiles_updated_at
  BEFORE UPDATEON profiles
FOR EACH ROWEXECUTEFUNCTION update_updated_at_column();

CREATETRIGGER update_transactions_updated_at
  BEFORE UPDATEONtransactions
FOR EACH ROWEXECUTEFUNCTION update_updated_at_column();

CREATETRIGGER update_contacts_updated_at
  BEFORE UPDATEON contacts
FOR EACH ROWEXECUTEFUNCTION update_updated_at_column();

CREATETRIGGER update_subscriptions_updated_at
  BEFORE UPDATEON subscriptions
FOR EACH ROWEXECUTEFUNCTION update_updated_at_column();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADDTABLE profiles;
ALTER PUBLICATION supabase_realtime ADDTABLEtransactions;
ALTER PUBLICATION supabase_realtime ADDTABLE balance_history;
ALTER PUBLICATION supabase_realtime ADDTABLE mpesa_transactions;

-- ============================================
-- SEED DATA (Initial subscription plans)
-- ============================================

-- Create default subscription plans reference
CREATETABLEpublic.subscription_plans (
  id TEXTPRIMARYKEY,
  name TEXTNOTNULL,
  monthly_fee DECIMAL(10,2)NOTNULL,
  transaction_fee_percentage DECIMAL(5,4)NOTNULL,
  monthly_transaction_limit INTEGER,
  features JSONB
);

INSERTINTO subscription_plans (id, name, monthly_fee, transaction_fee_percentage, monthly_transaction_limit, features)VALUES
('free','Free Plan',0,0.020,5,'{"transactions_per_month": 5, "support": "community", "priority": "low"}'::jsonb),
('basic','Basic Plan',99,0.010,50,'{"transactions_per_month": 50, "support": "email", "priority": "normal", "voice_receipts": true}'::jsonb),
('pro','Pro Plan',499,0.005,NULL,'{"transactions_per_month": "unlimited", "support": "priority", "priority": "high", "analytics": true, "api_access": true}'::jsonb),
('business','Business Plan',1999,0.003,NULL,'{"transactions_per_month": "unlimited", "support": "dedicated", "priority": "highest", "multi_user": true, "white_label": true, "api_access": true}'::jsonb);
```

---

## KEY IMPROVEMENTS TO YOUR SCHEMA

### 1. **Your Transaction Structure - Enhanced**

sql

```sql
-- Your original fields are preserved:
type, amount, phone, till, paybill, account, agent, store, bank_code,
status, voice_verified, confidence_score, voice_command_text,
mpesa_transaction_id, external_ref

-- Added:
- error_message (for failed transactions)
- retry_count (track retries)
- completed_at (timestampwhen completed)
- Better constraints and checks
```

### 2. **Balance Management**

* `wallet_balance` in profiles (main balance)
* `balance_history` table (audit trail of every change)
* `update_user_balance()` function (safe balance updates)

### 3. **Payment Flexibility**

* Auto top-up from M-Pesa when balance low
* Saved payment methods (cards, M-Pesa, banks)
* Default payment method selection

### 4. **Revenue Model Built-In**

* Subscriptions table with plans
* Transaction fee percentages per plan
* Monthly transaction limits
* Stripe integration fields

### 5. **Security**

* Row Level Security (RLS) on all tables
* PIN hash storage
* Biometric authentication flag
* Session tracking

---

## EXAMPLE QUERIES

### Insert Transaction (from N8N)

sql

```sql
INSERTINTOtransactions(
  user_id,type, amount, phone, till, paybill, account,
  agent, store, bank_code,status, voice_verified,
  confidence_score, voice_command_text, mpesa_transaction_id, external_ref
)VALUES(
'15f7bee0-76b8-478c-87ff-dc9212b1464e',
'send_phone',
1000.00,
'254712345678',
'','','','','','',
'pending',
true,
85,
'Send 1000 to John Doe',
'',
''
);
```

### Update Balance

sql

```sql
SELECT update_user_balance(
'15f7bee0-76b8-478c-87ff-dc9212b1464e',-- user_id
'transaction-uuid-here',-- transaction_id
-1000.00,-- change_amount (negative = deduct)
'send_phone transaction'-- reason
);
```

### Get User Transactions with Balance

sql

```sql
SELECT 
  t.*,
  p.wallet_balance
FROMtransactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.user_id ='15f7bee0-76b8-478c-87ff-dc9212b1464e'
ORDERBY t.created_at DESC;
```

---

## MIGRATION PLAN

If you already have data:

sql

```sql
-- Step 1: Backup existing data
CREATETABLE transactions_backup ASSELECT*FROMtransactions;

-- Step 2: Add missing columns
ALTERTABLEtransactionsADDCOLUMNIFNOTEXISTS error_message TEXT;
ALTERTABLEtransactionsADDCOLUMNIFNOTEXISTS retry_count INTEGERDEFAULT0;
ALTERTABLEtransactionsADDCOLUMNIFNOTEXISTS completed_at TIMESTAMPWITHTIME ZONE;

-- Step 3: Add constraints
ALTERTABLEtransactionsADDCONSTRAINT check_amount 
CHECK(amount >0AND amount <=999999);

-- Step 4: Create new tables
-- (Run all the CREATE TABLE statements above for new tables)
```

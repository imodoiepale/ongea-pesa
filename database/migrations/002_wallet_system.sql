-- =============================================
-- ONGEA PESA WALLET SYSTEM MIGRATION
-- Version: 2.0.0
-- Description: Enhanced wallet system with B2C, C2B, B2B, C2S support
-- =============================================

-- =============================================
-- 1. MAIN WALLETS TABLE (Enhanced)
-- =============================================

-- Note: We're using the existing 'profiles' table as the main wallet
-- This migration adds necessary columns if they don't exist

-- Add wallet-related columns to profiles table (if not exists)
DO $$ 
BEGIN
    -- Check and add wallet_balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='wallet_balance') THEN
        ALTER TABLE profiles ADD COLUMN wallet_balance DECIMAL(15,2) DEFAULT 0.00;
    END IF;

    -- Check and add daily_limit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='daily_limit') THEN
        ALTER TABLE profiles ADD COLUMN daily_limit DECIMAL(15,2) DEFAULT 100000.00;
    END IF;

    -- Check and add monthly_limit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='monthly_limit') THEN
        ALTER TABLE profiles ADD COLUMN monthly_limit DECIMAL(15,2) DEFAULT 500000.00;
    END IF;

    -- Check and add wallet_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='wallet_status') THEN
        ALTER TABLE profiles ADD COLUMN wallet_status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Add constraint to ensure positive balance
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS positive_balance;
ALTER TABLE profiles ADD CONSTRAINT positive_balance CHECK (wallet_balance >= 0);

-- =============================================
-- 2. PLATFORM REVENUE TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS platform_revenue (
    revenue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    revenue_type VARCHAR(30) NOT NULL, -- 'platform_fee', 'subscription', 'premium'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    transaction_type VARCHAR(30), -- Which transaction type generated this (c2c, c2b, etc)
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    posted_date DATE DEFAULT CURRENT_DATE
);

-- Indexes for revenue queries
CREATE INDEX IF NOT EXISTS idx_revenue_date ON platform_revenue(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_type ON platform_revenue(revenue_type, posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_transaction ON platform_revenue(transaction_id);

-- =============================================
-- 3. WALLET TRANSACTION LOG (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS wallet_transaction_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES auth.users(id), -- Using user_id as wallet_id
    transaction_id UUID REFERENCES transactions(id),
    transaction_type VARCHAR(30),
    amount DECIMAL(15,2),
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    operation VARCHAR(20), -- 'debit', 'credit'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for wallet log queries
CREATE INDEX IF NOT EXISTS idx_wallet_log ON wallet_transaction_log(wallet_id, created_at DESC);

-- =============================================
-- 4. ENHANCED TRANSACTIONS TABLE UPDATES
-- =============================================

-- Add platform fee tracking columns to transactions table
DO $$ 
BEGIN
    -- Check and add platform_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='platform_fee') THEN
        ALTER TABLE transactions ADD COLUMN platform_fee DECIMAL(15,2) DEFAULT 0.00;
    END IF;

    -- Check and add mpesa_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='mpesa_fee') THEN
        ALTER TABLE transactions ADD COLUMN mpesa_fee DECIMAL(15,2) DEFAULT 0.00;
    END IF;

    -- Check and add total_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='total_fee') THEN
        ALTER TABLE transactions ADD COLUMN total_fee DECIMAL(15,2) DEFAULT 0.00;
    END IF;

    -- Check and add recipient_id column for internal transfers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='recipient_id') THEN
        ALTER TABLE transactions ADD COLUMN recipient_id UUID REFERENCES auth.users(id);
    END IF;

    -- Check and add reference_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='reference_number') THEN
        ALTER TABLE transactions ADD COLUMN reference_number VARCHAR(100) UNIQUE;
    END IF;

    -- Check and add transaction_category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='transaction_category') THEN
        ALTER TABLE transactions ADD COLUMN transaction_category VARCHAR(30);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(transaction_category);

-- =============================================
-- 5. DATABASE FUNCTIONS FOR WALLET OPERATIONS
-- =============================================

-- Function to process internal transfers (C2C, C2B, B2C, B2B)
CREATE OR REPLACE FUNCTION process_internal_transfer(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount DECIMAL,
    p_platform_fee DECIMAL,
    p_transaction_type VARCHAR,
    p_description TEXT,
    p_reference VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_sender_balance DECIMAL;
    v_recipient_balance DECIMAL;
    v_new_sender_balance DECIMAL;
    v_new_recipient_balance DECIMAL;
    v_total_debit DECIMAL;
BEGIN
    -- Calculate total debit (amount + platform fee)
    v_total_debit := p_amount + p_platform_fee;

    -- Get current balances
    SELECT wallet_balance INTO v_sender_balance
    FROM profiles WHERE id = p_sender_id;

    SELECT wallet_balance INTO v_recipient_balance
    FROM profiles WHERE id = p_recipient_id;

    -- Check sufficient balance
    IF v_sender_balance < v_total_debit THEN
        RAISE EXCEPTION 'Insufficient funds. Required: %, Available: %', v_total_debit, v_sender_balance;
    END IF;

    -- Calculate new balances
    v_new_sender_balance := v_sender_balance - v_total_debit;
    v_new_recipient_balance := v_recipient_balance + p_amount;

    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        recipient_id,
        type,
        transaction_category,
        amount,
        platform_fee,
        total_fee,
        status,
        reference_number,
        voice_command_text,
        created_at,
        completed_at
    ) VALUES (
        p_sender_id,
        p_recipient_id,
        p_transaction_type,
        'send',
        p_amount,
        p_platform_fee,
        p_platform_fee,
        'completed',
        p_reference,
        p_description,
        NOW(),
        NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Update sender balance
    UPDATE profiles 
    SET wallet_balance = v_new_sender_balance,
        updated_at = NOW()
    WHERE id = p_sender_id;

    -- Update recipient balance
    UPDATE profiles 
    SET wallet_balance = v_new_recipient_balance,
        updated_at = NOW()
    WHERE id = p_recipient_id;

    -- Log sender transaction
    INSERT INTO wallet_transaction_log (
        wallet_id,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        operation
    ) VALUES (
        p_sender_id,
        v_transaction_id,
        p_transaction_type,
        v_total_debit,
        v_sender_balance,
        v_new_sender_balance,
        'debit'
    );

    -- Log recipient transaction
    INSERT INTO wallet_transaction_log (
        wallet_id,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        operation
    ) VALUES (
        p_recipient_id,
        v_transaction_id,
        p_transaction_type,
        p_amount,
        v_recipient_balance,
        v_new_recipient_balance,
        'credit'
    );

    -- Record platform revenue
    INSERT INTO platform_revenue (
        transaction_id,
        revenue_type,
        amount,
        transaction_type,
        user_id
    ) VALUES (
        v_transaction_id,
        'platform_fee',
        p_platform_fee,
        p_transaction_type,
        p_sender_id
    );

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. TRIGGER: Auto-update wallet balance on deposit
-- =============================================

CREATE OR REPLACE FUNCTION auto_credit_wallet()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Only process completed deposit transactions
    IF NEW.status = 'completed' AND NEW.type = 'deposit' THEN
        -- Get current balance
        SELECT wallet_balance INTO v_current_balance
        FROM profiles WHERE id = NEW.user_id;

        -- Calculate new balance
        v_new_balance := v_current_balance + NEW.amount;

        -- Update wallet balance
        UPDATE profiles 
        SET wallet_balance = v_new_balance,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        -- Log the transaction
        INSERT INTO wallet_transaction_log (
            wallet_id,
            transaction_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            operation
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.type,
            NEW.amount,
            v_current_balance,
            v_new_balance,
            'credit'
        );

        RAISE NOTICE 'Wallet credited: User %, Amount %, New Balance %', NEW.user_id, NEW.amount, v_new_balance;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_credit_wallet ON transactions;
CREATE TRIGGER trigger_auto_credit_wallet
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND NEW.type = 'deposit')
    EXECUTE FUNCTION auto_credit_wallet();

-- =============================================
-- 7. TRIGGER: Auto-debit wallet on withdrawal completion
-- =============================================

CREATE OR REPLACE FUNCTION auto_debit_wallet()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Only process completed withdrawal transactions
    IF NEW.status = 'completed' AND NEW.type = 'withdraw' AND OLD.status != 'completed' THEN
        -- Note: Balance was already reserved when withdrawal was initiated
        -- This trigger just logs the completion
        
        SELECT wallet_balance INTO v_current_balance
        FROM profiles WHERE id = NEW.user_id;

        INSERT INTO wallet_transaction_log (
            wallet_id,
            transaction_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            operation
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.type,
            NEW.amount,
            v_current_balance + NEW.amount,
            v_current_balance,
            'debit'
        );

        RAISE NOTICE 'Withdrawal completed: User %, Amount %', NEW.user_id, NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_debit_wallet ON transactions;
CREATE TRIGGER trigger_auto_debit_wallet
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND NEW.type = 'withdraw')
    EXECUTE FUNCTION auto_debit_wallet();

-- =============================================
-- 8. ANALYTICS VIEWS FOR REPORTING
-- =============================================

-- Daily revenue summary view
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT 
    posted_date,
    revenue_type,
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_revenue,
    AVG(amount) as average_revenue
FROM platform_revenue
GROUP BY posted_date, revenue_type, transaction_type
ORDER BY posted_date DESC;

-- User wallet summary view
CREATE OR REPLACE VIEW user_wallet_summary AS
SELECT 
    p.id as user_id,
    p.email,
    p.wallet_balance,
    p.daily_limit,
    p.monthly_limit,
    p.wallet_status,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_withdrawals
FROM profiles p
LEFT JOIN transactions t ON p.id = t.user_id
GROUP BY p.id, p.email, p.wallet_balance, p.daily_limit, p.monthly_limit, p.wallet_status;

-- =============================================
-- 9. GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON wallet_transaction_log TO authenticated;
GRANT SELECT, INSERT ON platform_revenue TO authenticated;

-- Grant read access to service role
GRANT ALL ON transactions TO service_role;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON wallet_transaction_log TO service_role;
GRANT ALL ON platform_revenue TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE '✅ Wallet System Migration Completed Successfully';
    RAISE NOTICE '📊 Tables created/updated: profiles, platform_revenue, wallet_transaction_log';
    RAISE NOTICE '⚡ Functions created: process_internal_transfer';
    RAISE NOTICE '🔔 Triggers created: auto_credit_wallet, auto_debit_wallet';
    RAISE NOTICE '📈 Views created: daily_revenue_summary, user_wallet_summary';
END $$;

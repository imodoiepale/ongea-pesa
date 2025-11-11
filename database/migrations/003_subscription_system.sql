-- =============================================
-- SUBSCRIPTION & FREE TRANSACTION SYSTEM
-- Monthly KES 5000 subscription + 20 free sends
-- =============================================

-- =============================================
-- 1. ADD SUBSCRIPTION FIELDS TO PROFILES
-- =============================================

DO $$ 
BEGIN
    -- Subscription status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='subscription_status') THEN
        ALTER TABLE profiles ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
    END IF;

    -- Subscription tier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='subscription_tier') THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'basic';
    END IF;

    -- Subscription start date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='subscription_start_date') THEN
        ALTER TABLE profiles ADD COLUMN subscription_start_date TIMESTAMP;
    END IF;

    -- Subscription end date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='subscription_end_date') THEN
        ALTER TABLE profiles ADD COLUMN subscription_end_date TIMESTAMP;
    END IF;

    -- Free transactions remaining this month
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='free_transactions_remaining') THEN
        ALTER TABLE profiles ADD COLUMN free_transactions_remaining INTEGER DEFAULT 0;
    END IF;

    -- Last free transaction reset date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='last_free_tx_reset') THEN
        ALTER TABLE profiles ADD COLUMN last_free_tx_reset TIMESTAMP;
    END IF;

    -- Total free transactions used
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='total_free_tx_used') THEN
        ALTER TABLE profiles ADD COLUMN total_free_tx_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================
-- 2. SUBSCRIPTION PAYMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
    currency VARCHAR(3) DEFAULT 'KES',
    payment_method VARCHAR(50), -- mpesa, card, wallet
    payment_reference VARCHAR(100),
    mpesa_transaction_id VARCHAR(100),
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status, billing_period_start);

-- =============================================
-- 3. UPDATE PLATFORM REVENUE TABLE
-- =============================================

DO $$ 
BEGIN
    -- Add subscription-related revenue type
    ALTER TABLE platform_revenue DROP CONSTRAINT IF EXISTS revenue_type_check;
    
    -- Update revenue_type to include subscription
    -- Values: 'platform_fee', 'subscription', 'premium', 'mpesa_withdrawal_fee'
END $$;

-- =============================================
-- 4. FUNCTION: CHECK FREE TRANSACTION ELIGIBILITY
-- =============================================

CREATE OR REPLACE FUNCTION check_free_transaction_eligibility(
    p_user_id UUID,
    p_amount DECIMAL
)
RETURNS TABLE (
    is_eligible BOOLEAN,
    free_tx_remaining INTEGER,
    subscription_active BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_subscription_status VARCHAR(20);
    v_subscription_end_date TIMESTAMP;
    v_free_tx_remaining INTEGER;
    v_last_reset TIMESTAMP;
    v_is_eligible BOOLEAN;
    v_reason TEXT;
BEGIN
    -- Get user subscription and free transaction info
    SELECT 
        subscription_status,
        subscription_end_date,
        free_transactions_remaining,
        last_free_tx_reset
    INTO 
        v_subscription_status,
        v_subscription_end_date,
        v_free_tx_remaining,
        v_last_reset
    FROM profiles
    WHERE id = p_user_id;

    -- Check if subscription is active
    IF v_subscription_status = 'active' AND v_subscription_end_date >= NOW() THEN
        -- Check if we need to reset monthly free transactions
        IF v_last_reset IS NULL OR 
           EXTRACT(MONTH FROM v_last_reset) != EXTRACT(MONTH FROM NOW()) OR
           EXTRACT(YEAR FROM v_last_reset) != EXTRACT(YEAR FROM NOW()) THEN
            -- Reset free transactions to 20
            UPDATE profiles
            SET free_transactions_remaining = 20,
                last_free_tx_reset = NOW()
            WHERE id = p_user_id;
            
            v_free_tx_remaining := 20;
        END IF;

        -- Check eligibility: amount > 1000 AND free transactions available
        IF p_amount >= 1000 AND v_free_tx_remaining > 0 THEN
            v_is_eligible := TRUE;
            v_reason := 'Free transaction available';
        ELSIF p_amount < 1000 THEN
            v_is_eligible := FALSE;
            v_reason := 'Amount below KES 1000 minimum for free transaction';
        ELSE
            v_is_eligible := FALSE;
            v_reason := 'No free transactions remaining this month';
        END IF;

        RETURN QUERY SELECT v_is_eligible, v_free_tx_remaining, TRUE, v_reason;
    ELSE
        -- Subscription not active
        RETURN QUERY SELECT FALSE, 0, FALSE, 'Subscription not active';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FUNCTION: PROCESS SUBSCRIPTION PAYMENT
-- =============================================

CREATE OR REPLACE FUNCTION process_subscription_payment(
    p_user_id UUID,
    p_amount DECIMAL,
    p_payment_method VARCHAR,
    p_payment_reference VARCHAR,
    p_mpesa_transaction_id VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calculate billing period (next month)
    v_start_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
    v_end_date := v_start_date + INTERVAL '1 month' - INTERVAL '1 day';

    -- Create subscription payment record
    INSERT INTO subscription_payments (
        user_id,
        amount,
        payment_method,
        payment_reference,
        mpesa_transaction_id,
        billing_period_start,
        billing_period_end,
        status,
        payment_date
    ) VALUES (
        p_user_id,
        p_amount,
        p_payment_method,
        p_payment_reference,
        p_mpesa_transaction_id,
        v_start_date,
        v_end_date,
        'completed',
        NOW()
    ) RETURNING payment_id INTO v_payment_id;

    -- Update user profile subscription status
    UPDATE profiles
    SET subscription_status = 'active',
        subscription_start_date = COALESCE(subscription_start_date, v_start_date),
        subscription_end_date = v_end_date,
        free_transactions_remaining = 20,
        last_free_tx_reset = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record subscription revenue
    INSERT INTO platform_revenue (
        transaction_id,
        revenue_type,
        amount,
        transaction_type,
        user_id,
        created_at,
        posted_date
    ) VALUES (
        v_payment_id,
        'subscription',
        p_amount,
        'subscription_monthly',
        p_user_id,
        NOW(),
        CURRENT_DATE
    );

    RAISE NOTICE '✅ Subscription payment processed for user %', p_user_id;
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. FUNCTION: USE FREE TRANSACTION
-- =============================================

CREATE OR REPLACE FUNCTION use_free_transaction(
    p_user_id UUID,
    p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_free_tx_remaining INTEGER;
BEGIN
    -- Decrement free transaction count
    UPDATE profiles
    SET free_transactions_remaining = free_transactions_remaining - 1,
        total_free_tx_used = total_free_tx_used + 1
    WHERE id = p_user_id
      AND free_transactions_remaining > 0
    RETURNING free_transactions_remaining INTO v_free_tx_remaining;

    IF FOUND THEN
        RAISE NOTICE '✅ Free transaction used. Remaining: %', v_free_tx_remaining;
        
        -- Log the free transaction in wallet_transaction_log
        INSERT INTO wallet_transaction_log (
            wallet_id,
            transaction_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            operation
        ) VALUES (
            p_user_id,
            p_transaction_id,
            'free_transaction_used',
            0,
            0,
            0,
            'credit'
        );
        
        RETURN TRUE;
    ELSE
        RAISE NOTICE '⚠️ No free transactions available';
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. VIEW: SUBSCRIPTION REVENUE SUMMARY
-- =============================================

CREATE OR REPLACE VIEW subscription_revenue_summary AS
SELECT 
    DATE_TRUNC('month', payment_date) as month,
    COUNT(*) as total_subscriptions,
    COUNT(DISTINCT user_id) as unique_subscribers,
    SUM(amount) as total_revenue,
    AVG(amount) as average_payment,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
FROM subscription_payments
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month DESC;

-- =============================================
-- 8. VIEW: USER SUBSCRIPTION STATUS
-- =============================================

CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
    p.id as user_id,
    p.email,
    p.subscription_status,
    p.subscription_tier,
    p.subscription_start_date,
    p.subscription_end_date,
    p.free_transactions_remaining,
    p.total_free_tx_used,
    p.last_free_tx_reset,
    CASE 
        WHEN p.subscription_end_date >= NOW() THEN TRUE
        ELSE FALSE
    END as is_active,
    COUNT(sp.payment_id) as total_payments,
    SUM(sp.amount) as total_paid
FROM profiles p
LEFT JOIN subscription_payments sp ON p.id = sp.user_id AND sp.status = 'completed'
GROUP BY p.id, p.email, p.subscription_status, p.subscription_tier, 
         p.subscription_start_date, p.subscription_end_date, 
         p.free_transactions_remaining, p.total_free_tx_used, p.last_free_tx_reset;

-- =============================================
-- 9. TRIGGER: AUTO-DEACTIVATE EXPIRED SUBSCRIPTIONS
-- =============================================

CREATE OR REPLACE FUNCTION auto_deactivate_expired_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET subscription_status = 'expired',
        free_transactions_remaining = 0
    WHERE subscription_status = 'active'
      AND subscription_end_date < NOW();
    
    RAISE NOTICE 'Deactivated % expired subscriptions', FOUND;
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run daily (you can use pg_cron or external scheduler)
-- For now, it can be called manually or via cron job

-- =============================================
-- 10. GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE ON subscription_payments TO authenticated;
GRANT SELECT ON subscription_revenue_summary TO authenticated;
GRANT SELECT ON user_subscription_status TO authenticated;

GRANT ALL ON subscription_payments TO service_role;
GRANT ALL ON platform_revenue TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Subscription System Migration Completed';
    RAISE NOTICE '💰 Monthly Fee: KES 5,000';
    RAISE NOTICE '🎁 Free Transactions: 20 per month (amounts > KES 1,000)';
    RAISE NOTICE '📊 Tables: subscription_payments';
    RAISE NOTICE '⚡ Functions: check_free_transaction_eligibility, process_subscription_payment';
END $$;

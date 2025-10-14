-- ONGEA PESA COMPREHENSIVE DATABASE SCHEMA
-- Centralized Wallet Architecture with Full Fintech Support

-- =============================================
-- CORE USER & AUTHENTICATION TABLES
-- =============================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    biometric_hash TEXT,
    voice_profile_id UUID,
    security_level INTEGER DEFAULT 1,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    kyc_documents JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP
);

-- =============================================
-- CENTRALIZED WALLET SYSTEM
-- =============================================

CREATE TABLE main_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    total_balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    pending_balance DECIMAL(15,2) DEFAULT 0.00,
    primary_currency VARCHAR(3) DEFAULT 'KES',
    wallet_status VARCHAR(20) DEFAULT 'active',
    daily_limit DECIMAL(15,2) DEFAULT 100000.00,
    monthly_limit DECIMAL(15,2) DEFAULT 1000000.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_methods (
    method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES main_wallets(wallet_id),
    method_type VARCHAR(20) NOT NULL, -- mpesa, bank_card, crypto, airtel, paypal
    method_name VARCHAR(100) NOT NULL,
    account_identifier VARCHAR(255) NOT NULL, -- phone, card_number, wallet_address
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'KES',
    is_primary BOOLEAN DEFAULT false,
    auto_refill_enabled BOOLEAN DEFAULT false,
    min_threshold DECIMAL(15,2) DEFAULT 1000.00,
    max_refill_amount DECIMAL(15,2) DEFAULT 50000.00,
    provider_config JSONB, -- API keys, tokens, etc
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TRANSACTION SYSTEM
-- =============================================

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    wallet_id UUID REFERENCES main_wallets(wallet_id),
    source_method_id UUID REFERENCES payment_methods(method_id),
    destination_method_id UUID REFERENCES payment_methods(method_id),
    transaction_type VARCHAR(30) NOT NULL, -- send, receive, refill, withdraw, bill_payment
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    fees DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2) NOT NULL,
    recipient_identifier VARCHAR(255), -- phone, email, wallet_address
    recipient_name VARCHAR(255),
    reference_number VARCHAR(100) UNIQUE,
    external_reference VARCHAR(100),
    description TEXT,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    failure_reason TEXT,
    initiated_via VARCHAR(20) DEFAULT 'app', -- app, voice, api, scheduled
    voice_command_id UUID,
    scheduled_for TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transaction_fees (
    fee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(transaction_id),
    fee_type VARCHAR(30) NOT NULL, -- platform, gateway, network, exchange
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- CONTACTS & RECIPIENTS
-- =============================================

CREATE TABLE contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    phone_number VARCHAR(15),
    email VARCHAR(255),
    default_payment_method VARCHAR(20),
    preferred_currency VARCHAR(3) DEFAULT 'KES',
    notes TEXT,
    avatar_url TEXT,
    is_favorite BOOLEAN DEFAULT false,
    transaction_count INTEGER DEFAULT 0,
    last_transaction_date TIMESTAMP,
    total_sent DECIMAL(15,2) DEFAULT 0.00,
    total_received DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- VOICE SYSTEM
-- =============================================

CREATE TABLE voice_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    voice_samples JSONB, -- Array of voice sample URLs
    voice_model_id VARCHAR(255), -- ElevenLabs model ID
    accent VARCHAR(20),
    language_preference VARCHAR(10) DEFAULT 'en',
    speed_preference DECIMAL(3,2) DEFAULT 1.0,
    calibration_score DECIMAL(3,2) DEFAULT 0.0,
    last_calibrated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE voice_commands (
    command_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    session_id UUID,
    audio_url TEXT,
    transcript TEXT,
    intent VARCHAR(50),
    entities JSONB,
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    response_text TEXT,
    response_audio_url TEXT,
    action_taken VARCHAR(100),
    transaction_id UUID REFERENCES transactions(transaction_id),
    status VARCHAR(20) DEFAULT 'processed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- DOCUMENT & OCR SYSTEM
-- =============================================

CREATE TABLE scanned_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL, -- bill, receipt, id, meter_reading, invoice, qr_code
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT,
    ocr_provider VARCHAR(20) DEFAULT 'google_vision',
    raw_text TEXT,
    extracted_data JSONB,
    confidence_scores JSONB,
    validation_status VARCHAR(20) DEFAULT 'pending',
    category VARCHAR(50),
    tags TEXT[],
    related_transaction_id UUID REFERENCES transactions(transaction_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bill_payments (
    bill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    document_id UUID REFERENCES scanned_documents(document_id),
    provider VARCHAR(100) NOT NULL, -- KPLC, NCWSC, Safaricom, etc
    account_number VARCHAR(100) NOT NULL,
    bill_type VARCHAR(30) NOT NULL, -- electricity, water, internet, mobile
    amount_due DECIMAL(15,2) NOT NULL,
    due_date DATE,
    bill_period VARCHAR(20),
    reference_number VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    autopay_enabled BOOLEAN DEFAULT false,
    payment_method_id UUID REFERENCES payment_methods(method_id),
    last_payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- CRYPTOCURRENCY INTEGRATION
-- =============================================

CREATE TABLE crypto_wallets (
    crypto_wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(method_id),
    wallet_type VARCHAR(20) NOT NULL, -- metamask, coinbase, trust_wallet, hardware
    network VARCHAR(20) NOT NULL, -- ethereum, bitcoin, polygon, bsc
    wallet_address VARCHAR(255) NOT NULL,
    private_key_encrypted TEXT, -- Only for custodial wallets
    public_key TEXT,
    connection_method VARCHAR(20), -- walletconnect, api, import
    is_connected BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crypto_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crypto_wallet_id UUID REFERENCES crypto_wallets(crypto_wallet_id),
    token_symbol VARCHAR(10) NOT NULL,
    token_name VARCHAR(100),
    contract_address VARCHAR(255),
    decimals INTEGER DEFAULT 18,
    balance DECIMAL(30,18) DEFAULT 0,
    usd_value DECIMAL(15,2) DEFAULT 0,
    last_price_update TIMESTAMP,
    is_native BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SECURITY & AUDIT SYSTEM
-- =============================================

CREATE TABLE security_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    event_type VARCHAR(30) NOT NULL, -- login, failed_auth, suspicious_activity, policy_violation
    severity VARCHAR(10) NOT NULL, -- low, medium, high, critical
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    location_data JSONB,
    risk_score INTEGER DEFAULT 0,
    action_taken VARCHAR(100),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fraud_detection (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(transaction_id),
    user_id UUID REFERENCES users(user_id),
    risk_score INTEGER NOT NULL,
    risk_factors JSONB,
    ml_model_version VARCHAR(20),
    decision VARCHAR(20) NOT NULL, -- allow, block, review
    manual_review BOOLEAN DEFAULT false,
    reviewer_id UUID,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- =============================================
-- ANALYTICS & REPORTING
-- =============================================

CREATE TABLE user_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    date DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(15,2) DEFAULT 0,
    avg_transaction_size DECIMAL(15,2) DEFAULT 0,
    most_used_method VARCHAR(20),
    spending_categories JSONB,
    voice_usage_minutes INTEGER DEFAULT 0,
    ocr_scans_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- =============================================
-- SYSTEM CONFIGURATION
-- =============================================

CREATE TABLE system_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL, -- voice, security, payments, notifications
    preferences JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, category)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference ON transactions(reference_number);
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_voice_commands_user_date ON voice_commands(user_id, created_at DESC);
CREATE INDEX idx_security_events_user_date ON security_events(user_id, created_at DESC);
CREATE INDEX idx_scanned_documents_user_type ON scanned_documents(user_id, document_type);
CREATE INDEX idx_crypto_wallets_user ON crypto_wallets(user_id);
CREATE INDEX idx_bill_payments_user_status ON bill_payments(user_id, payment_status);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_main_wallets_updated_at BEFORE UPDATE ON main_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

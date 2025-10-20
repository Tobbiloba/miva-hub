-- ================================================
-- MIVA UNIVERSITY SUBSCRIPTION SYSTEM
-- Phase 0: Payment & Subscription Foundation
-- Migration 0019
-- ================================================

-- ================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- Stores PRO and MAX plan configurations
-- ================================================
CREATE TABLE IF NOT EXISTS subscription_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    price_ngn INTEGER NOT NULL,
    price_usd INTEGER,
    interval TEXT NOT NULL DEFAULT 'monthly',
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    paystack_plan_code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_active ON subscription_plan(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_paystack_code ON subscription_plan(paystack_plan_code);

COMMENT ON TABLE subscription_plan IS 'Subscription plans: PRO and MAX with features and limits';

-- Insert initial plans
INSERT INTO subscription_plan (name, display_name, description, price_ngn, features, limits, paystack_plan_code) VALUES
(
    'PRO',
    'MIVA PRO',
    'Perfect for regular students - study smart without breaking the bank',
    250000,
    '["AI Chat (30/day)", "GPT-3.5 Turbo", "3 Quizzes/week", "2 Exams/month", "Basic Feedback", "5 Courses max", "2 Flashcard sets/week", "5 Practice problems/week", "1 Study guide/week", "10 Material searches/day"]'::jsonb,
    '{
        "ai_messages_per_day": 30,
        "quizzes_per_week": 3,
        "exams_per_month": 2,
        "flashcard_sets_per_week": 2,
        "flashcards_per_set": 20,
        "practice_problems_per_week": 5,
        "study_guides_per_week": 1,
        "material_searches_per_day": 10,
        "max_courses": 5,
        "ai_model": "gpt-3.5-turbo",
        "response_priority": "standard",
        "feedback_quality": "basic"
    }'::jsonb,
    'PLN_pro_monthly'
),
(
    'MAX',
    'MIVA MAX',
    'For serious students who want unlimited access and advanced features',
    550000,
    '["Unlimited AI Chat", "GPT-4 + Claude 3.5", "Unlimited Quizzes", "Unlimited Exams", "Detailed Feedback", "Unlimited Courses", "Unlimited Flashcards", "Offline Mode", "HD Videos", "PDF Downloads", "Analytics Dashboard", "Past Question Analysis", "Study Groups"]'::jsonb,
    '{
        "ai_messages_per_day": -1,
        "quizzes_per_week": -1,
        "exams_per_month": -1,
        "flashcard_sets_per_week": -1,
        "flashcards_per_set": -1,
        "practice_problems_per_week": -1,
        "study_guides_per_week": -1,
        "material_searches_per_day": -1,
        "max_courses": -1,
        "ai_model": "gpt-4",
        "response_priority": "high",
        "feedback_quality": "detailed",
        "offline_mode": true,
        "hd_videos": true,
        "pdf_downloads": true,
        "analytics": true,
        "past_questions": true,
        "study_groups": true
    }'::jsonb,
    'PLN_max_monthly'
)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS user_subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plan(id),
    
    paystack_subscription_code TEXT UNIQUE,
    paystack_customer_code TEXT,
    paystack_email_token TEXT,
    paystack_authorization_code TEXT,
    
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    
    next_payment_date TIMESTAMP,
    last_payment_date TIMESTAMP,
    amount_paid_ngn INTEGER,
    
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_user ON user_subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON user_subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_paystack_code ON user_subscription(paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_subscription_next_payment ON user_subscription(next_payment_date);

COMMENT ON TABLE user_subscription IS 'Active subscriptions for users with Paystack integration';

-- ================================================
-- 3. USAGE TRACKING TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    usage_type TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    current_count INTEGER DEFAULT 0,
    limit_count INTEGER,
    
    last_reset_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_usage_period UNIQUE (user_id, usage_type, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_tracking(period_start, period_end);

COMMENT ON TABLE usage_tracking IS 'Track daily/weekly/monthly usage for limit enforcement';

-- ================================================
-- 4. PAYMENT TRANSACTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payment_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    paystack_reference TEXT UNIQUE NOT NULL,
    paystack_transaction_id TEXT,
    paystack_access_code TEXT,
    
    amount_ngn INTEGER NOT NULL,
    currency TEXT DEFAULT 'NGN',
    status TEXT NOT NULL,
    payment_method TEXT,
    
    customer_email TEXT,
    customer_name TEXT,
    
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_user ON payment_transaction(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_reference ON payment_transaction(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON payment_transaction(status);
CREATE INDEX IF NOT EXISTS idx_transaction_created ON payment_transaction(created_at DESC);

COMMENT ON TABLE payment_transaction IS 'Log all Paystack payment transactions';

-- ================================================
-- 5. WEBHOOK EVENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS webhook_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    paystack_event_id TEXT UNIQUE,
    
    payload JSONB NOT NULL,
    signature TEXT,
    
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON webhook_event(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON webhook_event(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_event(created_at DESC);

COMMENT ON TABLE webhook_event IS 'Log all Paystack webhook events for debugging';

-- ================================================
-- 6. SUBSCRIPTION CHANGE LOG
-- ================================================
CREATE TABLE IF NOT EXISTS subscription_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    change_type TEXT NOT NULL,
    from_plan_id UUID REFERENCES subscription_plan(id),
    to_plan_id UUID REFERENCES subscription_plan(id),
    
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_log_user ON subscription_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON subscription_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_change_log_created ON subscription_change_log(created_at DESC);

COMMENT ON TABLE subscription_change_log IS 'Audit log for subscription changes';

-- ================================================
-- 7. HELPER FUNCTIONS
-- ================================================

CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscription
        WHERE user_id = p_user_id
        AND status = 'active'
        AND current_period_end > NOW()
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_active_subscription IS 'Check if user has an active subscription';

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan_name TEXT;
BEGIN
    SELECT sp.name INTO v_plan_name
    FROM user_subscription us
    JOIN subscription_plan sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    LIMIT 1;
    
    RETURN COALESCE(v_plan_name, 'FREE');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_plan IS 'Get user current plan name (PRO, MAX, or FREE)';

CREATE OR REPLACE FUNCTION check_usage_limit(
    p_user_id UUID,
    p_usage_type TEXT,
    p_period_type TEXT DEFAULT 'daily'
)
RETURNS JSONB AS $$
DECLARE
    v_current_count INTEGER;
    v_limit_count INTEGER;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    IF p_period_type = 'daily' THEN
        v_period_start := CURRENT_DATE;
        v_period_end := CURRENT_DATE;
    ELSIF p_period_type = 'weekly' THEN
        v_period_start := date_trunc('week', CURRENT_DATE)::DATE;
        v_period_end := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
    ELSIF p_period_type = 'monthly' THEN
        v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
        v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;
    
    SELECT current_count, limit_count INTO v_current_count, v_limit_count
    FROM usage_tracking
    WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND period_type = p_period_type
    AND period_start = v_period_start;
    
    IF NOT FOUND THEN
        SELECT 
            0,
            CASE 
                WHEN sp.limits->>p_usage_type IS NULL THEN 0
                WHEN (sp.limits->>p_usage_type)::INTEGER = -1 THEN -1
                ELSE (sp.limits->>p_usage_type)::INTEGER
            END
        INTO v_current_count, v_limit_count
        FROM user_subscription us
        JOIN subscription_plan sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id
        AND us.status = 'active'
        AND us.current_period_end > NOW();
        
        IF NOT FOUND THEN
            v_current_count := 0;
            v_limit_count := 0;
        END IF;
        
        INSERT INTO usage_tracking (
            user_id, usage_type, period_type, period_start, period_end,
            current_count, limit_count
        ) VALUES (
            p_user_id, p_usage_type, p_period_type, v_period_start, v_period_end,
            v_current_count, v_limit_count
        );
    END IF;
    
    RETURN jsonb_build_object(
        'allowed', v_limit_count = -1 OR v_current_count < v_limit_count,
        'current', v_current_count,
        'limit', v_limit_count,
        'remaining', CASE 
            WHEN v_limit_count = -1 THEN -1
            ELSE GREATEST(0, v_limit_count - v_current_count)
        END,
        'period_type', p_period_type,
        'resets_at', v_period_end
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_usage_limit IS 'Check if user can perform action based on limits';

CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_usage_type TEXT,
    p_period_type TEXT DEFAULT 'daily',
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_usage_check JSONB;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    v_usage_check := check_usage_limit(p_user_id, p_usage_type, p_period_type);
    
    IF NOT (v_usage_check->>'allowed')::BOOLEAN THEN
        RETURN FALSE;
    END IF;
    
    IF p_period_type = 'daily' THEN
        v_period_start := CURRENT_DATE;
        v_period_end := CURRENT_DATE;
    ELSIF p_period_type = 'weekly' THEN
        v_period_start := date_trunc('week', CURRENT_DATE)::DATE;
        v_period_end := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
    ELSIF p_period_type = 'monthly' THEN
        v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
        v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;
    
    UPDATE usage_tracking
    SET 
        current_count = current_count + p_increment,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND period_type = p_period_type
    AND period_start = v_period_start;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_usage IS 'Increment usage counter and return success';

-- ================================================
-- 8. UPDATE USER SCHEMA
-- ================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user' AND column_name = 'paystack_customer_code') THEN
        ALTER TABLE "user" ADD COLUMN paystack_customer_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user' AND column_name = 'subscription_status') THEN
        ALTER TABLE "user" ADD COLUMN subscription_status TEXT DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user' AND column_name = 'current_plan') THEN
        ALTER TABLE "user" ADD COLUMN current_plan TEXT DEFAULT 'FREE';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_paystack_customer ON "user"(paystack_customer_code);

# Phase 0: Payment & Subscription Foundation - Implementation Plan

**Target Timeline:** 2 weeks  
**Payment Processor:** Paystack (Nigerian payment gateway)  
**Pricing:** PRO ₦2,500/month | MAX ₦5,500/month  
**Goal:** Launch revenue-generating subscription system for MIVA University AI Assistant

---

## 📋 Table of Contents

1. [Prerequisites & Research](#prerequisites--research)
2. [Database Schema Design](#database-schema-design)
3. [Backend Implementation](#backend-implementation)
4. [Paystack Integration](#paystack-integration)
5. [Frontend Implementation](#frontend-implementation)
6. [Usage Tracking & Limits](#usage-tracking--limits)
7. [Webhooks & Event Handling](#webhooks--event-handling)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Security Considerations](#security-considerations)

---

## 📚 Prerequisites & Research

### Paystack Account Setup
- [ ] Create Paystack account at https://paystack.com
- [ ] Complete KYC verification (required for Nigerian businesses)
- [ ] Get Test API keys (for development)
- [ ] Get Live API keys (for production)
- [ ] Enable subscription features in Paystack dashboard
- [ ] Set up webhook URL (we'll need a public URL for webhooks)

### Environment Variables Needed
```bash
# Add to .env file
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx  # Test key first
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For development
```

### NPM Packages to Install
```bash
# Frontend
pnpm add @paystack/inline-js
pnpm add @types/paystack__inline-js -D

# Backend (if needed for verification)
pnpm add paystack-node  # Optional, for server-side operations
```

### Paystack API Resources
- Subscriptions API: https://paystack.com/docs/payments/subscriptions/
- Webhooks: https://paystack.com/docs/payments/webhooks/
- Plans: https://support.paystack.com/hc/en-us/articles/360009881540-Plans
- Recurring Charges: https://paystack.com/docs/payments/recurring-charges/

---

## 🗄️ Database Schema Design

### Phase 1: Core Subscription Tables

**File:** `frontend/src/lib/db/migrations/pg/0019_subscription_system.sql`

```sql
-- ================================================
-- MIVA UNIVERSITY SUBSCRIPTION SYSTEM
-- Phase 0: Payment & Subscription Foundation
-- ================================================

-- ================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- Stores PRO and MAX plan configurations
-- ================================================
CREATE TABLE IF NOT EXISTS subscription_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                          -- 'PRO' or 'MAX'
    display_name TEXT NOT NULL,                  -- 'MIVA PRO' or 'MIVA MAX'
    description TEXT,
    price_ngn INTEGER NOT NULL,                  -- Price in kobo (₦2,500 = 250000)
    price_usd INTEGER,                           -- Price in cents (for future expansion)
    interval TEXT NOT NULL DEFAULT 'monthly',    -- monthly, quarterly, yearly
    features JSONB NOT NULL DEFAULT '[]',        -- Array of feature names
    limits JSONB NOT NULL DEFAULT '{}',          -- Usage limits (ai_messages, quizzes, etc.)
    paystack_plan_code TEXT UNIQUE,              -- Paystack plan code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plan_active ON subscription_plan(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_paystack_code ON subscription_plan(paystack_plan_code);

-- Insert initial plans
INSERT INTO subscription_plan (name, display_name, description, price_ngn, features, limits, paystack_plan_code) VALUES
(
    'PRO',
    'MIVA PRO',
    'Perfect for regular students - study smart without breaking the bank',
    250000, -- ₦2,500 in kobo
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
    'PLN_pro_monthly' -- Will be updated after Paystack plan creation
),
(
    'MAX',
    'MIVA MAX',
    'For serious students who want unlimited access and advanced features',
    550000, -- ₦5,500 in kobo
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
    'PLN_max_monthly' -- Will be updated after Paystack plan creation
)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- Tracks active subscriptions for each user
-- ================================================
CREATE TABLE IF NOT EXISTS user_subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plan(id),
    
    -- Paystack data
    paystack_subscription_code TEXT UNIQUE,      -- Paystack subscription code
    paystack_customer_code TEXT,                 -- Paystack customer code
    paystack_email_token TEXT,                   -- Email token for customer
    paystack_authorization_code TEXT,            -- Card authorization code
    
    -- Subscription status
    status TEXT NOT NULL DEFAULT 'active',       -- active, cancelled, expired, suspended
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    
    -- Billing
    next_payment_date TIMESTAMP,
    last_payment_date TIMESTAMP,
    amount_paid_ngn INTEGER,                     -- Last amount paid in kobo
    
    -- Metadata
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT user_one_active_subscription UNIQUE (user_id, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_user ON user_subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON user_subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_paystack_code ON user_subscription(paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_subscription_next_payment ON user_subscription(next_payment_date);

-- ================================================
-- 3. USAGE TRACKING TABLE
-- Tracks daily/weekly/monthly usage per user
-- ================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    -- Usage type and period
    usage_type TEXT NOT NULL,                    -- ai_messages, quizzes, exams, flashcards, etc.
    period_type TEXT NOT NULL,                   -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage data
    current_count INTEGER DEFAULT 0,
    limit_count INTEGER,                         -- -1 for unlimited
    
    -- Metadata
    last_reset_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_usage_period UNIQUE (user_id, usage_type, period_type, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_tracking(period_start, period_end);

-- ================================================
-- 4. PAYMENT TRANSACTIONS TABLE
-- Log all payment transactions
-- ================================================
CREATE TABLE IF NOT EXISTS payment_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    -- Paystack data
    paystack_reference TEXT UNIQUE NOT NULL,
    paystack_transaction_id TEXT,
    paystack_access_code TEXT,
    
    -- Transaction details
    amount_ngn INTEGER NOT NULL,                 -- Amount in kobo
    currency TEXT DEFAULT 'NGN',
    status TEXT NOT NULL,                        -- pending, success, failed, abandoned
    payment_method TEXT,                         -- card, bank_transfer, etc.
    
    -- Customer info
    customer_email TEXT,
    customer_name TEXT,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_user ON payment_transaction(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_reference ON payment_transaction(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON payment_transaction(status);
CREATE INDEX IF NOT EXISTS idx_transaction_created ON payment_transaction(created_at DESC);

-- ================================================
-- 5. WEBHOOK EVENTS TABLE
-- Log all webhook events from Paystack
-- ================================================
CREATE TABLE IF NOT EXISTS webhook_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,                    -- subscription.create, charge.success, etc.
    paystack_event_id TEXT UNIQUE,
    
    -- Event data
    payload JSONB NOT NULL,
    signature TEXT,
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON webhook_event(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON webhook_event(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_event(created_at DESC);

-- ================================================
-- 6. SUBSCRIPTION CHANGE LOG
-- Track subscription upgrades, downgrades, cancellations
-- ================================================
CREATE TABLE IF NOT EXISTS subscription_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscription(id) ON DELETE SET NULL,
    
    -- Change details
    change_type TEXT NOT NULL,                   -- upgrade, downgrade, cancel, reactivate, expire
    from_plan_id UUID REFERENCES subscription_plan(id),
    to_plan_id UUID REFERENCES subscription_plan(id),
    
    -- Reason and metadata
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_change_log_user ON subscription_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON subscription_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_change_log_created ON subscription_change_log(created_at DESC);

-- ================================================
-- 7. HELPER FUNCTIONS
-- ================================================

-- Function to check if user has active subscription
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

-- Function to get user's current plan
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

-- Function to check usage limit
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
    -- Determine period
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
    
    -- Get or create usage record
    SELECT current_count, limit_count INTO v_current_count, v_limit_count
    FROM usage_tracking
    WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND period_type = p_period_type
    AND period_start = v_period_start;
    
    -- If no record exists, get limit from subscription plan
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
        
        -- If still not found, user has no subscription (free tier)
        IF NOT FOUND THEN
            v_current_count := 0;
            v_limit_count := 0; -- Free tier has 0 limit
        END IF;
        
        -- Create usage record
        INSERT INTO usage_tracking (
            user_id, usage_type, period_type, period_start, period_end,
            current_count, limit_count
        ) VALUES (
            p_user_id, p_usage_type, p_period_type, v_period_start, v_period_end,
            v_current_count, v_limit_count
        );
    END IF;
    
    -- Return usage status
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

-- Function to increment usage
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
    -- Check if allowed
    v_usage_check := check_usage_limit(p_user_id, p_usage_type, p_period_type);
    
    IF NOT (v_usage_check->>'allowed')::BOOLEAN THEN
        RETURN FALSE;
    END IF;
    
    -- Determine period
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
    
    -- Increment usage
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

-- ================================================
-- 8. UPDATE USER SCHEMA
-- Add subscription-related fields to user table
-- ================================================

-- Check if columns don't exist before adding them
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

-- Create index on customer code
CREATE INDEX IF NOT EXISTS idx_user_paystack_customer ON "user"(paystack_customer_code);

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE subscription_plan IS 'Subscription plans: PRO and MAX with features and limits';
COMMENT ON TABLE user_subscription IS 'Active subscriptions for users with Paystack integration';
COMMENT ON TABLE usage_tracking IS 'Track daily/weekly/monthly usage for limit enforcement';
COMMENT ON TABLE payment_transaction IS 'Log all Paystack payment transactions';
COMMENT ON TABLE webhook_event IS 'Log all Paystack webhook events for debugging';
COMMENT ON TABLE subscription_change_log IS 'Audit log for subscription changes';

COMMENT ON FUNCTION has_active_subscription IS 'Check if user has an active subscription';
COMMENT ON FUNCTION get_user_plan IS 'Get user current plan name (PRO, MAX, or FREE)';
COMMENT ON FUNCTION check_usage_limit IS 'Check if user can perform action based on limits';
COMMENT ON FUNCTION increment_usage IS 'Increment usage counter and return success';
```

### Phase 2: Schema Updates for Drizzle ORM

**File:** `frontend/src/lib/db/pg/schema.pg.ts`

Add these schemas to the existing file:

```typescript
// ================================================
// SUBSCRIPTION SYSTEM SCHEMAS
// ================================================

export const SubscriptionPlanSchema = pgTable("subscription_plan", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  priceNgn: integer("price_ngn").notNull(), // Price in kobo
  priceUsd: integer("price_usd"), // Price in cents
  interval: text("interval").notNull().default("monthly"),
  features: json("features").notNull().default([]).$type<string[]>(),
  limits: json("limits").notNull().default({}).$type<Record<string, number>>(),
  paystackPlanCode: text("paystack_plan_code").unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSubscriptionSchema = pgTable("user_subscription", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => SubscriptionPlanSchema.id),
  
  // Paystack data
  paystackSubscriptionCode: text("paystack_subscription_code").unique(),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackEmailToken: text("paystack_email_token"),
  paystackAuthorizationCode: text("paystack_authorization_code"),
  
  // Subscription status
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  
  // Billing
  nextPaymentDate: timestamp("next_payment_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  amountPaidNgn: integer("amount_paid_ngn"),
  
  // Metadata
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  metadata: json("metadata").default({}).$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UsageTrackingSchema = pgTable("usage_tracking", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id")
    .references(() => UserSubscriptionSchema.id, { onDelete: "set null" }),
  
  usageType: text("usage_type").notNull(),
  periodType: text("period_type").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  currentCount: integer("current_count").default(0),
  limitCount: integer("limit_count"),
  
  lastResetAt: timestamp("last_reset_at").default(sql`CURRENT_TIMESTAMP`),
  metadata: json("metadata").default({}).$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const PaymentTransactionSchema = pgTable("payment_transaction", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id")
    .references(() => UserSubscriptionSchema.id, { onDelete: "set null" }),
  
  paystackReference: text("paystack_reference").notNull().unique(),
  paystackTransactionId: text("paystack_transaction_id"),
  paystackAccessCode: text("paystack_access_code"),
  
  amountNgn: integer("amount_ngn").notNull(),
  currency: text("currency").default("NGN"),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  
  description: text("description"),
  metadata: json("metadata").default({}).$type<Record<string, any>>(),
  paidAt: timestamp("paid_at"),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WebhookEventSchema = pgTable("webhook_event", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  eventType: text("event_type").notNull(),
  paystackEventId: text("paystack_event_id").unique(),
  
  payload: json("payload").notNull().$type<Record<string, any>>(),
  signature: text("signature"),
  
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const SubscriptionChangeLogSchema = pgTable("subscription_change_log", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id")
    .references(() => UserSubscriptionSchema.id, { onDelete: "set null" }),
  
  changeType: text("change_type").notNull(),
  fromPlanId: uuid("from_plan_id")
    .references(() => SubscriptionPlanSchema.id),
  toPlanId: uuid("to_plan_id")
    .references(() => SubscriptionPlanSchema.id),
  
  reason: text("reason"),
  metadata: json("metadata").default({}).$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Update UserSchema to add subscription fields
// Add these fields to existing UserSchema:
// paystackCustomerCode: text("paystack_customer_code"),
// subscriptionStatus: text("subscription_status").default("none"),
// currentPlan: text("current_plan").default("FREE"),
```

---

## 🔧 Backend Implementation

### Phase 1: Create Paystack Plans via Dashboard or API

**File:** `scripts/create-paystack-plans.ts`

```typescript
/**
 * Script to create Paystack subscription plans
 * Run: tsx scripts/create-paystack-plans.ts
 */

import { config } from "dotenv";
config();

interface PaystackPlan {
  name: string;
  amount: number; // In kobo
  interval: string;
  description?: string;
}

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

async function createPlan(plan: PaystackPlan) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(plan),
    });

    const data = await response.json();
    
    if (data.status) {
      console.log(`✅ Created plan: ${plan.name}`);
      console.log(`   Plan Code: ${data.data.plan_code}`);
      return data.data;
    } else {
      console.error(`❌ Failed to create plan: ${plan.name}`);
      console.error(`   Error: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating plan: ${plan.name}`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Creating Paystack Subscription Plans...\n");

  // PRO Plan
  const proPlan = await createPlan({
    name: "MIVA PRO Monthly",
    amount: 250000, // ₦2,500 in kobo
    interval: "monthly",
    description: "MIVA University PRO Plan - Smart studying for regular students",
  });

  // MAX Plan
  const maxPlan = await createPlan({
    name: "MIVA MAX Monthly",
    amount: 550000, // ₦5,500 in kobo
    interval: "monthly",
    description: "MIVA University MAX Plan - Unlimited access with advanced features",
  });

  console.log("\n✅ Plan creation complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update subscription_plan table with the plan codes:");
  console.log(`   - PRO: ${proPlan?.plan_code || "PLN_xxxxx"}`);
  console.log(`   - MAX: ${maxPlan?.plan_code || "PLN_xxxxx"}`);
  console.log("2. Run: npm run db:update-plan-codes");
}

main();
```

**File:** `scripts/update-plan-codes.ts`

```typescript
/**
 * Update database with Paystack plan codes
 * Run: tsx scripts/update-plan-codes.ts
 */

import { db } from "@/lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

async function updatePlanCodes() {
  console.log("🚀 Updating Paystack plan codes...");

  // Update PRO plan
  await db
    .update(SubscriptionPlanSchema)
    .set({ paystackPlanCode: "PLN_pro_code_here" }) // Replace with actual code
    .where(eq(SubscriptionPlanSchema.name, "PRO"));

  console.log("✅ Updated PRO plan code");

  // Update MAX plan
  await db
    .update(SubscriptionPlanSchema)
    .set({ paystackPlanCode: "PLN_max_code_here" }) // Replace with actual code
    .where(eq(SubscriptionPlanSchema.name, "MAX"));

  console.log("✅ Updated MAX plan code");
  console.log("✅ Done!");
}

updatePlanCodes();
```

### Phase 2: Subscription Repository

**File:** `frontend/src/lib/db/pg/repositories/subscription-repository.pg.ts`

```typescript
import { db } from "../db.pg";
import {
  SubscriptionPlanSchema,
  UserSubscriptionSchema,
  UsageTrackingSchema,
  PaymentTransactionSchema,
  SubscriptionChangeLogSchema,
} from "../schema.pg";
import { eq, and, gte, sql } from "drizzle-orm";

export class SubscriptionRepository {
  // ================================================
  // PLAN MANAGEMENT
  // ================================================

  async getAllPlans() {
    return await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.isActive, true));
  }

  async getPlanByName(name: string) {
    const [plan] = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.name, name));
    return plan;
  }

  async getPlanById(id: string) {
    const [plan] = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.id, id));
    return plan;
  }

  // ================================================
  // SUBSCRIPTION MANAGEMENT
  // ================================================

  async getUserActiveSubscription(userId: string) {
    const [subscription] = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(
        and(
          eq(UserSubscriptionSchema.userId, userId),
          eq(UserSubscriptionSchema.status, "active"),
          gte(UserSubscriptionSchema.currentPeriodEnd, new Date())
        )
      )
      .limit(1);
    return subscription;
  }

  async createSubscription(data: {
    userId: string;
    planId: string;
    paystackSubscriptionCode: string;
    paystackCustomerCode: string;
    paystackAuthorizationCode: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentDate: Date;
  }) {
    const [subscription] = await db
      .insert(UserSubscriptionSchema)
      .values({
        ...data,
        status: "active",
      })
      .returning();
    return subscription;
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<typeof UserSubscriptionSchema.$inferInsert>
  ) {
    const [updated] = await db
      .update(UserSubscriptionSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(UserSubscriptionSchema.id, subscriptionId))
      .returning();
    return updated;
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    const updates: any = {
      cancelAtPeriodEnd,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };

    if (!cancelAtPeriodEnd) {
      updates.status = "cancelled";
    }

    const [cancelled] = await db
      .update(UserSubscriptionSchema)
      .set(updates)
      .where(eq(UserSubscriptionSchema.id, subscriptionId))
      .returning();
    return cancelled;
  }

  // ================================================
  // USAGE TRACKING
  // ================================================

  async checkUsageLimit(
    userId: string,
    usageType: string,
    periodType: "daily" | "weekly" | "monthly" = "daily"
  ) {
    const result = await db.execute(sql`
      SELECT check_usage_limit(${userId}, ${usageType}, ${periodType}) as usage_status
    `);
    return result.rows[0]?.usage_status;
  }

  async incrementUsage(
    userId: string,
    usageType: string,
    periodType: "daily" | "weekly" | "monthly" = "daily",
    increment = 1
  ) {
    const result = await db.execute(sql`
      SELECT increment_usage(${userId}, ${usageType}, ${periodType}, ${increment}) as success
    `);
    return result.rows[0]?.success;
  }

  async getUserUsage(userId: string, usageType: string, periodType: string) {
    const [usage] = await db
      .select()
      .from(UsageTrackingSchema)
      .where(
        and(
          eq(UsageTrackingSchema.userId, userId),
          eq(UsageTrackingSchema.usageType, usageType),
          eq(UsageTrackingSchema.periodType, periodType)
        )
      )
      .orderBy(UsageTrackingSchema.periodStart)
      .limit(1);
    return usage;
  }

  // ================================================
  // PAYMENT TRANSACTIONS
  // ================================================

  async createTransaction(data: {
    userId: string;
    subscriptionId?: string;
    paystackReference: string;
    amountNgn: number;
    status: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
  }) {
    const [transaction] = await db
      .insert(PaymentTransactionSchema)
      .values(data)
      .returning();
    return transaction;
  }

  async updateTransaction(
    reference: string,
    updates: Partial<typeof PaymentTransactionSchema.$inferInsert>
  ) {
    const [updated] = await db
      .update(PaymentTransactionSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTransactionSchema.paystackReference, reference))
      .returning();
    return updated;
  }

  async getTransactionByReference(reference: string) {
    const [transaction] = await db
      .select()
      .from(PaymentTransactionSchema)
      .where(eq(PaymentTransactionSchema.paystackReference, reference));
    return transaction;
  }

  // ================================================
  // SUBSCRIPTION CHANGE LOG
  // ================================================

  async logSubscriptionChange(data: {
    userId: string;
    subscriptionId?: string;
    changeType: "upgrade" | "downgrade" | "cancel" | "reactivate" | "expire";
    fromPlanId?: string;
    toPlanId?: string;
    reason?: string;
  }) {
    const [log] = await db
      .insert(SubscriptionChangeLogSchema)
      .values(data)
      .returning();
    return log;
  }

  async getUserChangeLogs(userId: string, limit = 10) {
    return await db
      .select()
      .from(SubscriptionChangeLogSchema)
      .where(eq(SubscriptionChangeLogSchema.userId, userId))
      .orderBy(SubscriptionChangeLogSchema.createdAt)
      .limit(limit);
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  async getUserPlan(userId: string): Promise<string> {
    const result = await db.execute(sql`
      SELECT get_user_plan(${userId}) as plan_name
    `);
    return result.rows[0]?.plan_name || "FREE";
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT has_active_subscription(${userId}) as has_subscription
    `);
    return result.rows[0]?.has_subscription || false;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
```

---

## 💳 Paystack Integration

### Phase 1: Paystack Service

**File:** `frontend/src/lib/payment/paystack-service.ts`

```typescript
/**
 * Paystack Service
 * Handles all Paystack API interactions
 */

import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_API_URL = "https://api.paystack.co";

export interface InitializeSubscriptionParams {
  email: string;
  planCode: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    customer: {
      id: number;
      customer_code: string;
      email: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
    };
    plan?: {
      id: number;
      plan_code: string;
      name: string;
    };
    subscription?: {
      subscription_code: string;
      email_token: string;
      next_payment_date: string;
    };
  };
}

class PaystackService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = PAYSTACK_SECRET_KEY;
    this.baseUrl = PAYSTACK_API_URL;
  }

  // ================================================
  // SUBSCRIPTION INITIALIZATION
  // ================================================

  async initializeSubscription(params: InitializeSubscriptionParams) {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          plan: params.planCode,
          callback_url: params.callbackUrl,
          metadata: params.metadata,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error initializing subscription:", error);
      throw error;
    }
  }

  // ================================================
  // TRANSACTION VERIFICATION
  // ================================================

  async verifyTransaction(
    reference: string
  ): Promise<VerifyTransactionResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error verifying transaction:", error);
      throw error;
    }
  }

  // ================================================
  // SUBSCRIPTION MANAGEMENT
  // ================================================

  async disableSubscription(subscriptionCode: string, emailToken: string) {
    try {
      const response = await fetch(`${this.baseUrl}/subscription/disable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: subscriptionCode,
          token: emailToken,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error disabling subscription:", error);
      throw error;
    }
  }

  async enableSubscription(subscriptionCode: string, emailToken: string) {
    try {
      const response = await fetch(`${this.baseUrl}/subscription/enable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: subscriptionCode,
          token: emailToken,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error enabling subscription:", error);
      throw error;
    }
  }

  async getSubscription(subscriptionCode: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscription/${subscriptionCode}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw error;
    }
  }

  // ================================================
  // WEBHOOK VERIFICATION
  // ================================================

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac("sha512", this.apiKey)
      .update(payload)
      .digest("hex");
    return hash === signature;
  }

  // ================================================
  // CUSTOMER MANAGEMENT
  // ================================================

  async createCustomer(email: string, firstName?: string, lastName?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/customer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async getCustomer(emailOrCode: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/customer/${emailOrCode}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting customer:", error);
      throw error;
    }
  }
}

export const paystackService = new PaystackService();
```

---

## 🎨 Frontend Implementation

### Phase 1: Pricing Page

**File:** `frontend/src/app/(chat)/pricing/page.tsx`

```typescript
import { Metadata } from "next";
import { PricingClient } from "./pricing-client";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export const metadata: Metadata = {
  title: "Pricing - MIVA University AI Assistant",
  description: "Choose the perfect plan for your academic journey",
};

export default async function PricingPage() {
  const plans = await subscriptionRepository.getAllPlans();

  return <PricingClient plans={plans} />;
}
```

**File:** `frontend/src/app/(chat)/pricing/pricing-client.tsx`

```typescript
"use client";

import { useState } from "react";
import { Check, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceNgn: number;
  features: string[];
  limits: Record<string, number>;
  paystackPlanCode: string;
}

export function PricingClient({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planCode: string, planName: string) => {
    if (!session?.user) {
      router.push("/sign-in?redirect=/pricing");
      return;
    }

    setLoading(planCode);

    try {
      // Call API to initialize subscription
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode,
          planName,
        }),
      });

      const data = await response.json();

      if (data.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = data.authorizationUrl;
      }
    } catch (error) {
      console.error("Error initializing subscription:", error);
      alert("Failed to initialize subscription. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (priceKobo: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(priceKobo / 100);
  };

  const proPlan = plans.find((p) => p.name === "PRO");
  const maxPlan = plans.find((p) => p.name === "MAX");

  return (
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Study smarter with AI-powered assistance. Start with PRO, upgrade to MAX when you need more.
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* PRO Plan */}
        {proPlan && (
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{proPlan.displayName}</CardTitle>
                <Badge variant="secondary">POPULAR</Badge>
              </div>
              <CardDescription>{proPlan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice(proPlan.priceNgn)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscribe(proPlan.paystackPlanCode, proPlan.name)}
                disabled={loading === proPlan.paystackPlanCode}
              >
                {loading === proPlan.paystackPlanCode ? "Processing..." : "Get Started with PRO"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* MAX Plan */}
        {maxPlan && (
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                BEST VALUE
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{maxPlan.displayName}</CardTitle>
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardDescription>{maxPlan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice(maxPlan.priceNgn)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {maxPlan.features.slice(0, 10).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
                {maxPlan.features.length > 10 && (
                  <li className="text-sm text-muted-foreground">
                    + {maxPlan.features.length - 10} more features
                  </li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => handleSubscribe(maxPlan.paystackPlanCode, maxPlan.name)}
                disabled={loading === maxPlan.paystackPlanCode}
              >
                {loading === maxPlan.paystackPlanCode ? "Processing..." : "Upgrade to MAX"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">Detailed Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl mx-auto">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4">Feature</th>
                <th className="text-center py-4 px-4">PRO</th>
                <th className="text-center py-4 px-4">MAX</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <ComparisonRow 
                feature="AI Messages"
                pro="30/day"
                max="Unlimited"
              />
              <ComparisonRow 
                feature="AI Model"
                pro="GPT-3.5 Turbo"
                max="GPT-4 + Claude 3.5"
              />
              <ComparisonRow 
                feature="Quizzes"
                pro="3/week"
                max="Unlimited"
              />
              <ComparisonRow 
                feature="Practice Exams"
                pro="2/month"
                max="Unlimited"
              />
              <ComparisonRow 
                feature="Offline Mode"
                pro={false}
                max={true}
              />
              <ComparisonRow 
                feature="HD Videos"
                pro={false}
                max={true}
              />
              <ComparisonRow 
                feature="Analytics Dashboard"
                pro={false}
                max={true}
              />
              <ComparisonRow 
                feature="Study Groups"
                pro={false}
                max={true}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ 
  feature, 
  pro, 
  max 
}: { 
  feature: string; 
  pro: string | boolean; 
  max: string | boolean; 
}) {
  return (
    <tr className="border-b">
      <td className="py-3 px-4">{feature}</td>
      <td className="py-3 px-4 text-center">
        {typeof pro === "boolean" ? (
          pro ? <Check className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-gray-400 mx-auto" />
        ) : (
          pro
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {typeof max === "boolean" ? (
          max ? <Check className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-gray-400 mx-auto" />
        ) : (
          max
        )}
      </td>
    </tr>
  );
}
```

### Phase 2: Subscription API Routes

**File:** `frontend/src/app/api/subscription/initialize/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planCode, planName } = await req.json();

    // Check if user already has active subscription
    const existingSubscription = await subscriptionRepository.getUserActiveSubscription(session.user.id);
    
    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = await subscriptionRepository.getPlanByName(planName);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Initialize subscription with Paystack
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/callback`;
    
    const initResponse = await paystackService.initializeSubscription({
      email: session.user.email,
      planCode: plan.paystackPlanCode,
      callbackUrl,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        planName: plan.name,
      },
    });

    if (!initResponse.status) {
      return NextResponse.json(
        { error: "Failed to initialize subscription" },
        { status: 500 }
      );
    }

    // Log transaction as pending
    await subscriptionRepository.createTransaction({
      userId: session.user.id,
      paystackReference: initResponse.data.reference,
      amountNgn: plan.priceNgn,
      status: "pending",
      customerEmail: session.user.email,
      customerName: session.user.name,
      description: `${plan.displayName} - Monthly Subscription`,
    });

    return NextResponse.json({
      authorizationUrl: initResponse.data.authorization_url,
      reference: initResponse.data.reference,
    });
  } catch (error) {
    console.error("Error initializing subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**File:** `frontend/src/app/api/subscription/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.redirect(
        new URL("/pricing?error=invalid_reference", req.url)
      );
    }

    // Verify transaction with Paystack
    const verification = await paystackService.verifyTransaction(reference);

    if (!verification.status || verification.data.status !== "success") {
      await subscriptionRepository.updateTransaction(reference, {
        status: "failed",
      });

      return NextResponse.redirect(
        new URL("/pricing?error=payment_failed", req.url)
      );
    }

    // Get transaction from database
    const transaction = await subscriptionRepository.getTransactionByReference(reference);

    if (!transaction) {
      return NextResponse.redirect(
        new URL("/pricing?error=transaction_not_found", req.url)
      );
    }

    // Create subscription in database
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await subscriptionRepository.createSubscription({
      userId: transaction.userId,
      planId: verification.data.plan?.plan_code || "",
      paystackSubscriptionCode: verification.data.subscription?.subscription_code || "",
      paystackCustomerCode: verification.data.customer.customer_code,
      paystackAuthorizationCode: verification.data.authorization.authorization_code,
      currentPeriodStart: currentDate,
      currentPeriodEnd: nextMonth,
      nextPaymentDate: new Date(verification.data.subscription?.next_payment_date || nextMonth),
    });

    // Update transaction
    await subscriptionRepository.updateTransaction(reference, {
      status: "success",
      paidAt: new Date(),
      paystackTransactionId: verification.data.id.toString(),
    });

    // Log subscription change
    await subscriptionRepository.logSubscriptionChange({
      userId: transaction.userId,
      subscriptionId: subscription.id,
      changeType: "upgrade",
      reason: "Initial subscription",
    });

    return NextResponse.redirect(
      new URL("/pricing?success=true", req.url)
    );
  } catch (error) {
    console.error("Error processing callback:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=processing_failed", req.url)
    );
  }
}
```

---

## 🔒 Usage Tracking & Limits

### Phase 1: Usage Middleware

**File:** `frontend/src/lib/middleware/usage-check.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function checkUsageLimit(
  req: NextRequest,
  usageType: string,
  periodType: "daily" | "weekly" | "monthly" = "daily"
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return {
      allowed: false,
      error: "Unauthorized",
      status: 401,
    };
  }

  const usageStatus = await subscriptionRepository.checkUsageLimit(
    session.user.id,
    usageType,
    periodType
  );

  if (!usageStatus.allowed) {
    const plan = await subscriptionRepository.getUserPlan(session.user.id);
    
    return {
      allowed: false,
      error: "Usage limit exceeded",
      status: 429,
      data: {
        current: usageStatus.current,
        limit: usageStatus.limit,
        plan,
        upgradeUrl: "/pricing",
      },
    };
  }

  return {
    allowed: true,
    data: usageStatus,
  };
}

export async function incrementUsageCount(
  userId: string,
  usageType: string,
  periodType: "daily" | "weekly" | "monthly" = "daily"
) {
  return await subscriptionRepository.incrementUsage(
    userId,
    usageType,
    periodType
  );
}
```

### Phase 2: Update Chat API with Usage Tracking

**File:** `frontend/src/app/api/chat/route.ts` (Update existing file)

Add usage checking before processing chat:

```typescript
import { checkUsageLimit, incrementUsageCount } from "@/lib/middleware/usage-check";

// Add this before processing the chat request
const usageCheck = await checkUsageLimit(req, "ai_messages_per_day", "daily");

if (!usageCheck.allowed) {
  return NextResponse.json(
    {
      error: usageCheck.error,
      ...usageCheck.data,
    },
    { status: usageCheck.status }
  );
}

// ... existing chat processing code ...

// After successful response, increment usage
await incrementUsageCount(session.user.id, "ai_messages_per_day", "daily");
```

---

## 🔔 Webhooks & Event Handling

### Webhook Handler

**File:** `frontend/src/app/api/webhooks/paystack/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { db } from "@/lib/db/pg/db.pg";
import { WebhookEventSchema } from "@/lib/db/pg/schema.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Log webhook event
    await db.insert(WebhookEventSchema).values({
      eventType: event.event,
      paystackEventId: event.data?.id?.toString(),
      payload: event,
      signature,
    });

    // Process event
    await processWebhookEvent(event);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function processWebhookEvent(event: any) {
  const eventType = event.event;
  const data = event.data;

  switch (eventType) {
    case "subscription.create":
      await handleSubscriptionCreate(data);
      break;

    case "subscription.disable":
      await handleSubscriptionDisable(data);
      break;

    case "charge.success":
      await handleChargeSuccess(data);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(data);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

async function handleSubscriptionCreate(data: any) {
  // Subscription created - already handled in callback
  console.log("Subscription created:", data.subscription_code);
}

async function handleSubscriptionDisable(data: any) {
  // Find and disable subscription
  const subscription = await db
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription_code))
    .limit(1);

  if (subscription[0]) {
    await subscriptionRepository.updateSubscription(subscription[0].id, {
      status: "cancelled",
    });

    await subscriptionRepository.logSubscriptionChange({
      userId: subscription[0].userId,
      subscriptionId: subscription[0].id,
      changeType: "cancel",
      reason: "Subscription disabled via webhook",
    });
  }
}

async function handleChargeSuccess(data: any) {
  // Recurring payment succeeded
  if (data.plan) {
    const subscription = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription.subscription_code))
      .limit(1);

    if (subscription[0]) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await subscriptionRepository.updateSubscription(subscription[0].id, {
        lastPaymentDate: new Date(),
        nextPaymentDate: nextMonth,
        amountPaidNgn: data.amount,
      });

      // Log successful payment
      await subscriptionRepository.createTransaction({
        userId: subscription[0].userId,
        subscriptionId: subscription[0].id,
        paystackReference: data.reference,
        paystackTransactionId: data.id.toString(),
        amountNgn: data.amount,
        status: "success",
        customerEmail: data.customer.email,
        description: "Monthly subscription renewal",
        paidAt: new Date(),
      });
    }
  }
}

async function handlePaymentFailed(data: any) {
  // Payment failed - notify user
  console.error("Payment failed:", data);
  // TODO: Send email notification to user
}
```

---

## ✅ Testing Strategy

### Manual Testing Checklist

**Week 1: Basic Flow**
- [ ] Create Paystack account and get API keys
- [ ] Create subscription plans in Paystack dashboard
- [ ] Apply database migration
- [ ] Update plan codes in database
- [ ] Test pricing page loads correctly
- [ ] Test subscription initialization
- [ ] Test payment with Paystack test card: `4084084084084081`
- [ ] Verify subscription created in database
- [ ] Verify transaction logged
- [ ] Check user can access features

**Week 2: Advanced Features**
- [ ] Test usage limits (ai_messages, quizzes, exams)
- [ ] Test upgrade prompts when limit hit
- [ ] Test webhook events (use Paystack dashboard to trigger)
- [ ] Test subscription cancellation
- [ ] Test subscription reactivation
- [ ] Test failed payment handling
- [ ] Test concurrent requests (rate limiting)

### Paystack Test Cards

```
Success: 4084084084084081
Declined: 4084080000000409
Insufficient Funds: 5060666666666666666
PIN Required: 5078000000000013 (PIN: 1234, OTP: 123456)
```

---

## 🚀 Deployment Checklist

### Environment Variables (Production)

```bash
# .env.production
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Live key
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Pre-Launch Checklist

- [ ] Switch to Paystack live keys
- [ ] Update webhook URL in Paystack dashboard
- [ ] Test webhooks with live endpoint
- [ ] Set up error monitoring (Sentry/LogRocket)
- [ ] Create backup/restore procedures
- [ ] Set up cron job for usage reset (midnight UTC)
- [ ] Test payment flow end-to-end in production
- [ ] Create customer support email template
- [ ] Prepare refund policy documentation
- [ ] Set up analytics tracking (plan conversions)

---

## 🔐 Security Considerations

### Critical Security Measures

1. **API Key Protection**
   - Never expose secret keys in frontend
   - Use environment variables
   - Rotate keys periodically

2. **Webhook Verification**
   - Always verify webhook signature
   - Log all webhook events
   - Implement idempotency

3. **User Data Protection**
   - Never log card details
   - Hash sensitive data
   - Comply with PCI DSS

4. **Rate Limiting**
   - Implement rate limiting on API routes
   - Prevent abuse of usage tracking
   - Use Redis for distributed rate limiting

5. **Transaction Security**
   - Use HTTPS only
   - Implement CSRF protection
   - Validate all inputs

---

## 📝 Scripts to Add to package.json

```json
{
  "scripts": {
    "paystack:create-plans": "tsx scripts/create-paystack-plans.ts",
    "paystack:update-codes": "tsx scripts/update-plan-codes.ts",
    "db:migrate:subscription": "psql $POSTGRES_URL -f frontend/src/lib/db/migrations/pg/0019_subscription_system.sql",
    "test:paystack": "tsx scripts/test-paystack-integration.ts"
  }
}
```

---

## 🎯 Success Metrics

### Week 1 Goals
- [ ] Pricing page live
- [ ] Payment flow working
- [ ] First test subscription created

### Week 2 Goals
- [ ] Usage limits enforced
- [ ] Webhooks processing
- [ ] 10 test transactions completed
- [ ] Ready for soft launch

### Soft Launch (Week 3)
- Target: 20-50 PRO subscribers
- Price: ₦1,250 (50% early bird discount)
- Goal: ₦25,000 - ₦62,500 MRR

---

## 📚 Additional Resources

- Paystack Documentation: https://paystack.com/docs
- Paystack Support: support@paystack.com
- Test Environment: https://dashboard.paystack.com
- API Reference: https://paystack.com/docs/api

---

**Document Status:** Ready for Review  
**Next Step:** Review this plan, then proceed with implementation  
**Estimated Total Time:** 10-14 days  
**First Milestone:** Working payment flow (Week 1)

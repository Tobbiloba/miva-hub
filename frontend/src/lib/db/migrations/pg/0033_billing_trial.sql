-- ================================================
-- ASKLY BILLING: Trial columns + Askly plans
-- Migration 0033
-- ================================================

-- 1. Add trial columns to user table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user' AND column_name = 'trial_started_at') THEN
        ALTER TABLE "user" ADD COLUMN trial_started_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE "user" ADD COLUMN trial_ends_at TIMESTAMP;
    END IF;
END $$;

-- 2. Insert Askly monthly plan (₦3,000 = 300000 kobo)
INSERT INTO subscription_plan (
    name, display_name, description, price_ngn, interval,
    features, limits, is_active
) VALUES (
    'ASKLY_MONTHLY',
    'Askly Monthly',
    'Full access to Askly — billed monthly',
    300000,
    'monthly',
    '["Full AI Chat Access", "All Course Materials", "Flashcards & Quizzes", "Progress Tracking", "Email Notifications"]'::jsonb,
    '{"ai_messages_per_day": -1, "quizzes_per_week": -1, "exams_per_month": -1, "flashcard_sets_per_week": -1, "max_courses": -1}'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- 3. Insert Askly yearly plan (₦30,000 = 3000000 kobo, ~17% off)
INSERT INTO subscription_plan (
    name, display_name, description, price_ngn, interval,
    features, limits, is_active
) VALUES (
    'ASKLY_YEARLY',
    'Askly Yearly',
    'Full access to Askly — billed yearly (save ₦6,000)',
    3000000,
    'yearly',
    '["Full AI Chat Access", "All Course Materials", "Flashcards & Quizzes", "Progress Tracking", "Email Notifications"]'::jsonb,
    '{"ai_messages_per_day": -1, "quizzes_per_week": -1, "exams_per_month": -1, "flashcard_sets_per_week": -1, "max_courses": -1}'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- 4. Backfill existing students with expired trials
-- Sets trial_started_at = created_at, trial_ends_at = created_at + 7 days
-- Only for role='student' where trial_started_at IS NULL
UPDATE "user"
SET
    trial_started_at = created_at,
    trial_ends_at = created_at + INTERVAL '7 days'
WHERE role = 'student'
  AND trial_started_at IS NULL;

-- 5. Index for trial expiry checks
CREATE INDEX IF NOT EXISTS idx_user_trial_ends ON "user"(trial_ends_at)
    WHERE trial_ends_at IS NOT NULL;

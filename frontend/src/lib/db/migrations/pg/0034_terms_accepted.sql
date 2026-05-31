-- Add terms_accepted_at to user table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user' AND column_name = 'terms_accepted_at') THEN
        ALTER TABLE "user" ADD COLUMN terms_accepted_at TIMESTAMP;
    END IF;
END $$;

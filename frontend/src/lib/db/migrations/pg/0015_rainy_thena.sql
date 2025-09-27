DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='current_semester') THEN
        ALTER TABLE "user" ADD COLUMN "current_semester" text;
    END IF; 
END $$;
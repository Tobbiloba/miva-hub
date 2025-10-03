-- Update course level column to support Nigerian academic levels
-- First, update existing 'undergraduate' values to '100L' as default undergraduate level
UPDATE "course" SET "level" = '100L' WHERE "level" = 'undergraduate';

-- Update existing 'graduate' values to 'graduate' (no change needed)
-- No action needed for existing 'graduate' records

-- Drop the existing constraint if any
ALTER TABLE "course" DROP CONSTRAINT IF EXISTS "course_level_check";

-- Alter the column to remove existing constraints
ALTER TABLE "course" ALTER COLUMN "level" DROP DEFAULT;

-- Add new constraint for the expanded level enum
ALTER TABLE "course" ADD CONSTRAINT "course_level_check" 
CHECK ("level" IN ('100L', '200L', '300L', '400L', 'graduate', 'doctoral'));

-- Set the new default value
ALTER TABLE "course" ALTER COLUMN "level" SET DEFAULT '100L';
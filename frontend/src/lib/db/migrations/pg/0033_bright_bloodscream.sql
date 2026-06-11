-- Multi-tenancy foundation: university table + university_id scoping.
-- Hand-edited from drizzle-kit output:
--   1. Drift objects (notification, study_activity, trial columns) guarded
--      with IF NOT EXISTS — they may already exist via earlier db:push.
--   2. NOT NULL university_id columns added as nullable first, backfilled
--      to the seeded MIVA university, then SET NOT NULL.
DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM('streak_milestone', 'streak_at_risk', 'course_neglected', 'flashcards_due', 'new_content');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."study_activity_type" AS ENUM('material_viewed', 'flashcard_reviewed', 'study_guide_generated', 'practice_questions_generated', 'quiz_viewed', 'assignment_viewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TYPE "public"."user_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"entity_url" text,
	"entity_id" uuid,
	"entity_metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"read_at" timestamp,
	"delivered_via" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"week_number" integer,
	"activity_type" "study_activity_type" NOT NULL,
	"entity_id" uuid,
	"entity_metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "university" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email_domains" json DEFAULT '[]'::json NOT NULL,
	"logo_url" text,
	"primary_color" varchar(20),
	"support_email" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "university_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "academic_session" DROP CONSTRAINT IF EXISTS "academic_session_session_name_unique";--> statement-breakpoint
ALTER TABLE "course" DROP CONSTRAINT IF EXISTS "course_course_code_unique";--> statement-breakpoint
ALTER TABLE "department" DROP CONSTRAINT IF EXISTS "department_code_unique";--> statement-breakpoint
ALTER TABLE "system_settings" DROP CONSTRAINT IF EXISTS "system_settings_category_key_unique";--> statement-breakpoint
ALTER TABLE "academic_session" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "program" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "university_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp;--> statement-breakpoint
-- Seed the first tenant: MIVA (all existing data belongs to it)
INSERT INTO "university" ("name", "slug", "email_domains", "status", "support_email")
VALUES ('MIVA Open University', 'miva', '["miva.edu.ng"]'::json, 'active', 'support@miva.edu.ng')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
UPDATE "user" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
UPDATE "department" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
UPDATE "program" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
UPDATE "course" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
UPDATE "academic_session" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
UPDATE "system_settings" SET "university_id" = (SELECT "id" FROM "university" WHERE "slug" = 'miva') WHERE "university_id" IS NULL;--> statement-breakpoint
-- Enforce NOT NULL now that all rows are backfilled
ALTER TABLE "academic_session" ALTER COLUMN "university_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course" ALTER COLUMN "university_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "department" ALTER COLUMN "university_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "program" ALTER COLUMN "university_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification" ADD CONSTRAINT "notification_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "study_activity" ADD CONSTRAINT "study_activity_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "study_activity" ADD CONSTRAINT "study_activity_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_student_unread_idx" ON "notification" USING btree ("student_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_student_recent_idx" ON "notification" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_activity_student_recent_idx" ON "study_activity" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_activity_student_course_week_idx" ON "study_activity" USING btree ("student_id","course_id","week_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_activity_student_type_idx" ON "study_activity" USING btree ("student_id","activity_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "university_status_idx" ON "university" USING btree ("status");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "academic_session" ADD CONSTRAINT "academic_session_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "course" ADD CONSTRAINT "course_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "department" ADD CONSTRAINT "department_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program" ADD CONSTRAINT "program_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academic_session_university_idx" ON "academic_session" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_university_idx" ON "course" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_university_idx" ON "department" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_university_idx" ON "program" USING btree ("university_id");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "academic_session" ADD CONSTRAINT "academic_session_university_name_unique" UNIQUE("university_id","session_name");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "course" ADD CONSTRAINT "course_university_code_unique" UNIQUE("university_id","course_code");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "department" ADD CONSTRAINT "department_university_code_unique" UNIQUE("university_id","code");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_university_category_key_unique" UNIQUE("university_id","category","key");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

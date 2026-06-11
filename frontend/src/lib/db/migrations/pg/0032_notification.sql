-- Hand-edited: guarded for idempotency. This table was originally created via
-- db:push, so the live DB already has these objects without a migration record.
DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM('streak_milestone', 'streak_at_risk', 'course_neglected', 'flashcards_due', 'new_content');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
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
DO $$ BEGIN
  ALTER TABLE "notification" ADD CONSTRAINT "notification_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_student_unread_idx" ON "notification" USING btree ("student_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_student_recent_idx" ON "notification" USING btree ("student_id","created_at");

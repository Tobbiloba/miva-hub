CREATE TYPE "public"."notification_type" AS ENUM('streak_milestone', 'streak_at_risk', 'course_neglected', 'flashcards_due', 'new_content');--> statement-breakpoint
CREATE TABLE "notification" (
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
ALTER TABLE "notification" ADD CONSTRAINT "notification_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_student_unread_idx" ON "notification" USING btree ("student_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notification_student_recent_idx" ON "notification" USING btree ("student_id","created_at");

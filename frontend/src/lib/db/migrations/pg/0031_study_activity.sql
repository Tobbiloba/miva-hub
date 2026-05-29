CREATE TYPE "public"."study_activity_type" AS ENUM('material_viewed', 'flashcard_reviewed', 'study_guide_generated', 'practice_questions_generated', 'quiz_viewed', 'assignment_viewed');--> statement-breakpoint
CREATE TABLE "study_activity" (
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
ALTER TABLE "study_activity" ADD CONSTRAINT "study_activity_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_activity" ADD CONSTRAINT "study_activity_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_activity_student_recent_idx" ON "study_activity" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "study_activity_student_course_week_idx" ON "study_activity" USING btree ("student_id","course_id","week_number");--> statement-breakpoint
CREATE INDEX "study_activity_student_type_idx" ON "study_activity" USING btree ("student_id","activity_type","created_at");

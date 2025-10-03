CREATE TABLE "course_week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"learning_objectives" text,
	"topics" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_week_course_id_week_number_unique" UNIQUE("course_id","week_number")
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "total_weeks" integer DEFAULT 16;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "course_week" ADD CONSTRAINT "course_week_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_week_course_idx" ON "course_week" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_week_number_idx" ON "course_week" USING btree ("week_number");
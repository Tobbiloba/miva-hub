ALTER TABLE "user" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "major" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "year" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'student';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "academic_year" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enrollment_status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "graduation_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_student_id_unique" UNIQUE("student_id");
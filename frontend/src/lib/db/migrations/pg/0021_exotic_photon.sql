CREATE TYPE "public"."academic_session_status_enum" AS ENUM('upcoming', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."semester_enum" AS ENUM('first', 'second');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'faculty', 'student');--> statement-breakpoint
CREATE TABLE "academic_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_name" text NOT NULL,
	"current_semester" "semester_enum" NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"first_sem_start" date,
	"first_sem_end" date,
	"second_sem_start" date,
	"second_sem_end" date,
	"status" "academic_session_status_enum" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "academic_session_session_name_unique" UNIQUE("session_name")
);
--> statement-breakpoint
CREATE TABLE "program_curriculum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"semester" "semester_enum" NOT NULL,
	"is_compulsory" boolean DEFAULT true NOT NULL,
	"order_in_semester" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "program_curriculum_program_id_course_id_level_semester_unique" UNIQUE("program_id","course_id","level","semester")
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role_enum" USING "role"::"public"."user_role_enum";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'student';--> statement-breakpoint
ALTER TABLE "course_prerequisite" ADD COLUMN "min_grade" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_level" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "admission_session" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "admission_level" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_session_status_idx" ON "academic_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "program_curriculum_lookup_idx" ON "program_curriculum" USING btree ("program_id","level","semester");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "user" SET current_level = CAST(year AS INTEGER) WHERE year ~ '^[0-9]+$' AND current_level IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academic_session_only_one_current_idx" ON "academic_session" ("is_current") WHERE "is_current" = true;
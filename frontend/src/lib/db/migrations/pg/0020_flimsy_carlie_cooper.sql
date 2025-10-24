CREATE TABLE "program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"department_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"session_type" varchar NOT NULL,
	"duration_minutes" integer NOT NULL,
	"activity_data" json,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE "study_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_study_sessions" ADD CONSTRAINT "student_study_sessions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_study_sessions" ADD CONSTRAINT "student_study_sessions_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_department_idx" ON "program" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "program_code_idx" ON "program" USING btree ("code");--> statement-breakpoint
CREATE INDEX "student_study_sessions_student_idx" ON "student_study_sessions" USING btree ("student_id","started_at");--> statement-breakpoint
CREATE INDEX "student_study_sessions_course_idx" ON "student_study_sessions" USING btree ("course_id","started_at");--> statement-breakpoint
CREATE INDEX "student_study_sessions_type_idx" ON "student_study_sessions" USING btree ("session_type");
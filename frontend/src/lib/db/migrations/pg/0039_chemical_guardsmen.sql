ALTER TYPE "public"."notification_type" ADD VALUE 'professor_outreach';--> statement-breakpoint
ALTER TYPE "public"."transcript_source_enum" ADD VALUE 'gemini';--> statement-breakpoint
CREATE TABLE "course_professor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"traits" json DEFAULT '[]'::json NOT NULL,
	"greeting" text NOT NULL,
	"persona_prompt" text NOT NULL,
	"model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_professor_course_id_unique" UNIQUE("course_id")
);
--> statement-breakpoint
CREATE TABLE "micro_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"overall_level" varchar NOT NULL,
	"competencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_summary" text NOT NULL,
	"verification_code" text NOT NULL,
	"status" varchar DEFAULT 'issued' NOT NULL,
	"model" text NOT NULL,
	"issued_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "micro_credential_verification_code_unique" UNIQUE("verification_code"),
	CONSTRAINT "micro_credential_student_id_course_id_unique" UNIQUE("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "study_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"weekly_goal" text NOT NULL,
	"rationale" text NOT NULL,
	"focus_concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals_summary" text,
	"model" text NOT NULL,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "study_plan_student_id_course_id_unique" UNIQUE("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "viva_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"focus_topic" text,
	"transcript" json DEFAULT '[]'::json,
	"rubric" json,
	"overall_score" integer,
	"model" text,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" text,
	"verify_code" text,
	"verify_code_expires_at" timestamp,
	"verified_at" timestamp,
	"active_course_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "whatsapp_link_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "whatsapp_link_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "course_professor" ADD CONSTRAINT "course_professor_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_credential" ADD CONSTRAINT "micro_credential_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_credential" ADD CONSTRAINT "micro_credential_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan" ADD CONSTRAINT "study_plan_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan" ADD CONSTRAINT "study_plan_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_session" ADD CONSTRAINT "viva_session_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_session" ADD CONSTRAINT "viva_session_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link" ADD CONSTRAINT "whatsapp_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link" ADD CONSTRAINT "whatsapp_link_active_course_id_course_id_fk" FOREIGN KEY ("active_course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_professor_course_idx" ON "course_professor" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "micro_credential_student_idx" ON "micro_credential" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "micro_credential_code_idx" ON "micro_credential" USING btree ("verification_code");--> statement-breakpoint
CREATE INDEX "study_plan_student_idx" ON "study_plan" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "viva_session_student_idx" ON "viva_session" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "viva_session_course_idx" ON "viva_session" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "whatsapp_link_phone_idx" ON "whatsapp_link" USING btree ("phone_number");
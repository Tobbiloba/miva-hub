CREATE TYPE "public"."admission_status_enum" AS ENUM('under_review', 'admitted', 'waitlisted', 'rejected', 'escalated');--> statement-breakpoint
CREATE TABLE "admission_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"previous_school" text,
	"transcript_text" text NOT NULL,
	"personal_statement" text,
	"document_name" text,
	"status" "admission_status_enum" DEFAULT 'under_review' NOT NULL,
	"ai_decision" text,
	"ai_reasoning" text,
	"ai_confidence" real,
	"verified_credentials" json DEFAULT '[]'::json,
	"decision_ledger_id" uuid,
	"provisioned_user_id" uuid,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "admission_application_email_program_unique" UNIQUE("email","program_id")
);
--> statement-breakpoint
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_decision_ledger_id_ai_decision_id_fk" FOREIGN KEY ("decision_ledger_id") REFERENCES "public"."ai_decision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_provisioned_user_id_user_id_fk" FOREIGN KEY ("provisioned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_application_university_idx" ON "admission_application" USING btree ("university_id","created_at");--> statement-breakpoint
CREATE INDEX "admission_application_status_idx" ON "admission_application" USING btree ("status");
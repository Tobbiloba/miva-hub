CREATE TABLE "ai_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid,
	"decision_type" varchar NOT NULL,
	"actor" text NOT NULL,
	"subject_type" text,
	"subject_id" uuid,
	"user_id" uuid,
	"model" text NOT NULL,
	"input_summary" text,
	"decision" text NOT NULL,
	"reasoning" text,
	"confidence" real,
	"status" varchar DEFAULT 'executed' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_decision" ADD CONSTRAINT "ai_decision_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_decision" ADD CONSTRAINT "ai_decision_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_decision" ADD CONSTRAINT "ai_decision_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_decision_university_idx" ON "ai_decision" USING btree ("university_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_decision_type_idx" ON "ai_decision" USING btree ("decision_type","created_at");--> statement-breakpoint
CREATE INDEX "ai_decision_status_idx" ON "ai_decision" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_decision_subject_idx" ON "ai_decision" USING btree ("subject_type","subject_id");
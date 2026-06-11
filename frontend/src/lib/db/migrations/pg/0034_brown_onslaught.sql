CREATE TABLE "faculty_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"position" varchar NOT NULL,
	"department_id" uuid NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "faculty_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "faculty_invite" ADD CONSTRAINT "faculty_invite_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_invite" ADD CONSTRAINT "faculty_invite_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_invite" ADD CONSTRAINT "faculty_invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faculty_invite_university_idx" ON "faculty_invite" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "faculty_invite_email_idx" ON "faculty_invite" USING btree ("email");--> statement-breakpoint
CREATE INDEX "faculty_invite_status_idx" ON "faculty_invite" USING btree ("status");
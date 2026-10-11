CREATE TABLE "school_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"school_name" text NOT NULL,
	"email_domain" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"university_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"linked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "school_request" ADD CONSTRAINT "school_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_request" ADD CONSTRAINT "school_request_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "school_request_user_idx" ON "school_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "school_request_domain_status_idx" ON "school_request" USING btree ("email_domain","status");
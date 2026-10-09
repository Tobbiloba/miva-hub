CREATE TABLE "waitlist_signup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"university" text,
	"role" varchar DEFAULT 'student' NOT NULL,
	"source" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_signup_email_idx" ON "waitlist_signup" USING btree ("email");
CREATE TABLE "capture_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar NOT NULL,
	"courses" json DEFAULT '[]'::json NOT NULL,
	"current_item" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"course_code" text NOT NULL,
	"course_title" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"course_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "capture_sync" ADD CONSTRAINT "capture_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_request" ADD CONSTRAINT "course_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_request" ADD CONSTRAINT "course_request_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_request" ADD CONSTRAINT "course_request_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capture_sync_user_idx" ON "capture_sync" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_request_user_course_idx" ON "course_request" USING btree ("user_id","university_id","course_code");--> statement-breakpoint
CREATE INDEX "course_request_university_status_idx" ON "course_request" USING btree ("university_id","status");
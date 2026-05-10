CREATE TYPE "public"."ingestion_job_status_enum" AS ENUM('queued', 'downloading', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ingestion_source_enum" AS ENUM('manual', 'volunteer_extension', 'scraper', 'seed');--> statement-breakpoint
CREATE TABLE "ingestion_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"course_id" uuid NOT NULL,
	"week_number" integer,
	"lesson_title" text NOT NULL,
	"session_id" uuid,
	"content_type" varchar NOT NULL,
	"payload" json NOT NULL,
	"status" "ingestion_job_status_enum" DEFAULT 'queued' NOT NULL,
	"course_material_id" uuid,
	"error_message" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "ingestion_source" "ingestion_source_enum" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "volunteer_id" uuid;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_volunteer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_course_material_id_course_material_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_material"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingestion_job_volunteer_idx" ON "ingestion_job" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX "ingestion_job_course_idx" ON "ingestion_job" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ingestion_job_status_idx" ON "ingestion_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingestion_job_created_idx" ON "ingestion_job" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_session_idx" ON "course_material" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "material_ingestion_source_idx" ON "course_material" USING btree ("ingestion_source");--> statement-breakpoint
CREATE INDEX "material_volunteer_idx" ON "course_material" USING btree ("volunteer_id");
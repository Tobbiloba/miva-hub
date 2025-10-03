CREATE TABLE IF NOT EXISTS "ai_processed_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_material_id" uuid NOT NULL,
	"extracted_text" text,
	"ai_summary" text,
	"key_concepts" json DEFAULT '[]'::json,
	"difficulty" varchar,
	"estimated_read_time" integer,
	"word_count" integer,
	"language_detected" varchar(10) DEFAULT 'en',
	"processing_metadata" json DEFAULT '{}'::json,
	"quality_score" numeric(3, 2),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ai_processed_content_course_material_id_unique" UNIQUE("course_material_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_processing_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_material_id" uuid NOT NULL,
	"job_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_material_id" uuid NOT NULL,
	"ai_processed_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_type" varchar DEFAULT 'content' NOT NULL,
	"embedding" text NOT NULL,
	"embedding_model" varchar(100) DEFAULT 'nomic-embed-text',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "public_url" text;--> statement-breakpoint
ALTER TABLE "ai_processed_content" ADD CONSTRAINT "ai_processed_content_course_material_id_course_material_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_processing_job" ADD CONSTRAINT "ai_processing_job_course_material_id_course_material_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_embedding" ADD CONSTRAINT "content_embedding_course_material_id_course_material_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_embedding" ADD CONSTRAINT "content_embedding_ai_processed_id_ai_processed_content_id_fk" FOREIGN KEY ("ai_processed_id") REFERENCES "public"."ai_processed_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_content_material_idx" ON "ai_processed_content" USING btree ("course_material_id");--> statement-breakpoint
CREATE INDEX "ai_content_difficulty_idx" ON "ai_processed_content" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "ai_job_material_idx" ON "ai_processing_job" USING btree ("course_material_id");--> statement-breakpoint
CREATE INDEX "ai_job_status_idx" ON "ai_processing_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_job_type_idx" ON "ai_processing_job" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "embedding_material_idx" ON "content_embedding" USING btree ("course_material_id");--> statement-breakpoint
CREATE INDEX "embedding_processed_idx" ON "content_embedding" USING btree ("ai_processed_id");--> statement-breakpoint
CREATE INDEX "embedding_type_idx" ON "content_embedding" USING btree ("chunk_type");--> statement-breakpoint
CREATE INDEX "embedding_chunk_idx" ON "content_embedding" USING btree ("chunk_index");
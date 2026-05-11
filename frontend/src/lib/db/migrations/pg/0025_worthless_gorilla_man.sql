CREATE TYPE "public"."transcript_source_enum" AS ENUM('pdfjs', 'vimeo_vtt', 'manual');--> statement-breakpoint
CREATE TYPE "public"."transcript_status_enum" AS ENUM('pending', 'extracting', 'extracted', 'failed', 'skipped');--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_text" text;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_source" "transcript_source_enum";--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_extracted_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_word_count" integer;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_status" "transcript_status_enum" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "transcript_error_message" text;--> statement-breakpoint
CREATE INDEX "material_transcript_status_idx" ON "course_material" USING btree ("transcript_status");--> statement-breakpoint
CREATE INDEX "material_transcript_text_gin_idx" ON "course_material" USING gin (to_tsvector('english', "transcript_text"));
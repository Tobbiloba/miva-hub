CREATE TYPE "public"."yt_dlp_status_enum" AS ENUM('pending', 'downloading', 'completed', 'failed', 'skipped');--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "yt_dlp_status" "yt_dlp_status_enum";--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "yt_dlp_error_message" text;--> statement-breakpoint
CREATE INDEX "material_yt_dlp_status_idx" ON "course_material" USING btree ("yt_dlp_status");
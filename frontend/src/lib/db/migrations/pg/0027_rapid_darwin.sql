ALTER TABLE "course_material" ADD COLUMN "vimeo_video_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "course_material_video_dedup_idx"
  ON "course_material" (course_id, COALESCE(week_number, -1), COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid), vimeo_video_id)
  WHERE vimeo_video_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "course_material_pdf_dedup_idx"
  ON "course_material" (course_id, COALESCE(week_number, -1), COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(file_name))
  WHERE mime_type = 'application/pdf' AND deleted_at IS NULL;
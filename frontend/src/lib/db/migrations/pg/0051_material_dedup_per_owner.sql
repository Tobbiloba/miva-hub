-- Private captures are per student: two students capturing the same lecture
-- video or PDF must each get their own material. The dedupe indexes from 0027
-- ignored the owner, so the second student's capture failed with a unique
-- violation. Shared materials (owner NULL) still dedupe among themselves.
DROP INDEX IF EXISTS "course_material_video_dedup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "course_material_video_dedup_idx"
  ON "course_material" (course_id, COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(week_number, -1), COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid), vimeo_video_id)
  WHERE vimeo_video_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "course_material_pdf_dedup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "course_material_pdf_dedup_idx"
  ON "course_material" (course_id, COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(week_number, -1), COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(file_name))
  WHERE mime_type = 'application/pdf' AND deleted_at IS NULL;

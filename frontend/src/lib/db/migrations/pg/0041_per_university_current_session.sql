-- One current academic session per university, not one platform-wide.
DROP INDEX IF EXISTS "academic_session_only_one_current_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "academic_session_one_current_per_university_idx" ON "academic_session" USING btree ("university_id") WHERE "academic_session"."is_current" = true;
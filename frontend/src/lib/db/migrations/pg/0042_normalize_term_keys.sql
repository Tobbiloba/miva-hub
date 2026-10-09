-- Normalize stored semesters to one canonical term key, "<session>-<semester>"
-- (e.g. "2025/2026-first"), the value lib/utils/semester.ts derives from the
-- university's current academic_session. Legacy values were written in three
-- other formats: "2025-fall"/"2026-spring" (registration), bare
-- "first"/"second" (self-enroll, admin forms). Mapping:
--   "YYYY-fall"            -> "YYYY/(YYYY+1)-first"
--   "YYYY-spring|summer"   -> "(YYYY-1)/YYYY-second"
--   "first"/"second"       -> academic_year (enrollments) or the course
--                             university's current session name
-- Values already canonical, or unresolvable, are left unchanged. Data-only;
-- dry-run on local and prod showed no unique-key collisions.
UPDATE "student_enrollment" se SET "semester" = CASE
    WHEN se."semester" ~ '^\d{4}-fall$'
      THEN left(se."semester", 4) || '/' || (left(se."semester", 4)::int + 1) || '-first'
    WHEN se."semester" ~ '^\d{4}-(spring|summer)$'
      THEN (left(se."semester", 4)::int - 1) || '/' || left(se."semester", 4) || '-second'
    WHEN se."semester" IN ('first', 'second') AND se."academic_year" ~ '^\d{4}-\d{4}$'
      THEN replace(se."academic_year", '-', '/') || '-' || se."semester"
    WHEN se."semester" IN ('first', 'second')
      THEN coalesce((
        SELECT s."session_name" || '-' || se."semester"
        FROM "course" c
        JOIN "academic_session" s ON s."university_id" = c."university_id" AND s."is_current" = true
        WHERE c."id" = se."course_id"
      ), se."semester")
    ELSE se."semester"
  END
WHERE se."semester" !~ '^\d{4}/\d{4}-(first|second)$';--> statement-breakpoint
UPDATE "course_instructor" ci SET "semester" = CASE
    WHEN ci."semester" ~ '^\d{4}-fall$'
      THEN left(ci."semester", 4) || '/' || (left(ci."semester", 4)::int + 1) || '-first'
    WHEN ci."semester" ~ '^\d{4}-(spring|summer)$'
      THEN (left(ci."semester", 4)::int - 1) || '/' || left(ci."semester", 4) || '-second'
    WHEN ci."semester" IN ('first', 'second')
      THEN coalesce((
        SELECT s."session_name" || '-' || ci."semester"
        FROM "course" c
        JOIN "academic_session" s ON s."university_id" = c."university_id" AND s."is_current" = true
        WHERE c."id" = ci."course_id"
      ), ci."semester")
    ELSE ci."semester"
  END
WHERE ci."semester" !~ '^\d{4}/\d{4}-(first|second)$';--> statement-breakpoint
UPDATE "class_schedule" cs SET "semester" = CASE
    WHEN cs."semester" ~ '^\d{4}-fall$'
      THEN left(cs."semester", 4) || '/' || (left(cs."semester", 4)::int + 1) || '-first'
    WHEN cs."semester" ~ '^\d{4}-(spring|summer)$'
      THEN (left(cs."semester", 4)::int - 1) || '/' || left(cs."semester", 4) || '-second'
    WHEN cs."semester" IN ('first', 'second')
      THEN coalesce((
        SELECT s."session_name" || '-' || cs."semester"
        FROM "course" c
        JOIN "academic_session" s ON s."university_id" = c."university_id" AND s."is_current" = true
        WHERE c."id" = cs."course_id"
      ), cs."semester")
    ELSE cs."semester"
  END
WHERE cs."semester" !~ '^\d{4}/\d{4}-(first|second)$';

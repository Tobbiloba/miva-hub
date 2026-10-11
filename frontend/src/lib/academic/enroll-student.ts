import "server-only";

import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { CourseSchema, StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { termKey } from "@/lib/utils/semester";
import { and, eq } from "drizzle-orm";

export type EnrollResult =
  | { ok: true; outcome: "enrolled" | "reenrolled"; courseCode: string }
  | {
      ok: false;
      reason: "course_not_found" | "no_active_session" | "already_enrolled";
    };

/**
 * Enroll a student in a course of THEIR university for the current term.
 * `universityId` must come from the student's own user row, never a request.
 * Re-enrolling after a drop reactivates the same row.
 */
export async function enrollStudent(
  studentId: string,
  universityId: string,
  courseId: string,
): Promise<EnrollResult> {
  const [course] = await pgDb
    .select({
      id: CourseSchema.id,
      courseCode: CourseSchema.courseCode,
      isActive: CourseSchema.isActive,
    })
    .from(CourseSchema)
    .where(
      and(
        eq(CourseSchema.id, courseId),
        eq(CourseSchema.universityId, universityId),
      ),
    )
    .limit(1);
  if (!course || !course.isActive) {
    return { ok: false, reason: "course_not_found" };
  }

  // Current term comes from the academic_session table (the platform's
  // live source — academic_calendar is legacy and unpopulated)
  const activeSession =
    await pgAcademicRepository.getActiveAcademicSession(universityId);
  if (!activeSession) return { ok: false, reason: "no_active_session" };
  // Canonical term key, e.g. "2025/2026-first" (same as registration)
  const semester = termKey(
    activeSession.sessionName,
    activeSession.currentSemester,
  );

  const [existing] = await pgDb
    .select({
      id: StudentEnrollmentSchema.id,
      status: StudentEnrollmentSchema.status,
    })
    .from(StudentEnrollmentSchema)
    .where(
      and(
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.courseId, courseId),
        eq(StudentEnrollmentSchema.semester, semester),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "dropped") {
      await pgDb
        .update(StudentEnrollmentSchema)
        .set({ status: "enrolled", updatedAt: new Date() })
        .where(eq(StudentEnrollmentSchema.id, existing.id));
      return { ok: true, outcome: "reenrolled", courseCode: course.courseCode };
    }
    return { ok: false, reason: "already_enrolled" };
  }

  await pgDb.insert(StudentEnrollmentSchema).values({
    studentId,
    courseId,
    semester,
    academicYear: activeSession.sessionName.replace("/", "-"),
    status: "enrolled",
  });
  return { ok: true, outcome: "enrolled", courseCode: course.courseCode };
}

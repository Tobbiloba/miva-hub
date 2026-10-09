import "server-only";

import { and, count, eq, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  IngestionJobSchema,
  StudentEnrollmentSchema,
} from "lib/db/pg/schema.pg";

export type CaptureOnboardingStatus = {
  /** Enrolled in at least one course on Askly (capture requires it). */
  hasCourses: boolean;
  /** Has sent anything from the extension (any job, or a quiz/assignment page). */
  hasCaptured: boolean;
  /** Captured items that became materials. */
  capturedCount: number;
};

/**
 * Where a student is on the first-run path: add courses → install the
 * extension → capture. Videos/PDFs create an ingestion_job; quiz and
 * assignment pages create a course_material directly; both record the
 * capturer in volunteer_id.
 */
export async function getCaptureOnboardingStatus(
  userId: string,
): Promise<CaptureOnboardingStatus> {
  const [[courses], [jobs], [materials]] = await Promise.all([
    pgDb
      .select({ n: count() })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, userId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      ),
    pgDb
      .select({ n: count() })
      .from(IngestionJobSchema)
      .where(eq(IngestionJobSchema.volunteerId, userId)),
    pgDb
      .select({ n: count() })
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.volunteerId, userId),
          isNull(CourseMaterialSchema.deletedAt),
        ),
      ),
  ]);
  return {
    hasCourses: courses.n > 0,
    hasCaptured: jobs.n > 0 || materials.n > 0,
    capturedCount: materials.n,
  };
}

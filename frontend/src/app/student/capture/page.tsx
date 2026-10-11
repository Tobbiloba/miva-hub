import { CaptureHub } from "@/components/captures/capture-hub";
import { getSession } from "@/lib/auth/server";
import { getPendingSchool } from "@/lib/schools/pending";
import { and, asc, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "lib/db/pg/schema.pg";
import { redirect } from "next/navigation";

/** Askly Capture: connect the extension and track everything captured */
export default async function CapturePage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const [pendingSchool, courses] = await Promise.all([
    getPendingSchool(session.user.id),
    // Capture files lessons under the student's enrolled courses
    pgDb
      .selectDistinct({
        id: CourseSchema.id,
        code: CourseSchema.courseCode,
        title: CourseSchema.title,
      })
      .from(StudentEnrollmentSchema)
      .innerJoin(
        CourseSchema,
        eq(CourseSchema.id, StudentEnrollmentSchema.courseId),
      )
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, session.user.id),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      )
      .orderBy(asc(CourseSchema.courseCode)),
  ]);

  return (
    <CaptureHub
      courses={courses}
      pendingSchool={pendingSchool?.schoolName ?? null}
    />
  );
}

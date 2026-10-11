import { CaptureHub } from "@/components/captures/capture-hub";
import { getSession } from "@/lib/auth/server";
import { getPendingSchool } from "@/lib/schools/pending";
import { and, asc, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  CourseSchema,
  StudentEnrollmentSchema,
  UniversitySchema,
  UserSchema,
} from "lib/db/pg/schema.pg";
import { redirect } from "next/navigation";

/** Askly Capture: connect the extension and track everything captured */
export default async function CapturePage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const [pendingSchool, [school], courses] = await Promise.all([
    getPendingSchool(session.user.id),
    pgDb
      .select({ slug: UniversitySchema.slug })
      .from(UserSchema)
      .innerJoin(
        UniversitySchema,
        eq(UniversitySchema.id, UserSchema.universityId),
      )
      .where(eq(UserSchema.id, session.user.id))
      .limit(1),
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
      // The extension reads MIVA's LMS; other schools capture page by page
      lmsSupported={school?.slug === "miva"}
    />
  );
}

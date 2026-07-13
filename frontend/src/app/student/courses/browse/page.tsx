import {
  type BrowsableCourse,
  CourseBrowser,
} from "@/components/student/course-browser";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  CourseSchema,
  DepartmentSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BrowseCoursesPage() {
  const session = await getSession();
  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const [userRow] = await pgDb
    .select({ universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, session.user.id))
    .limit(1);

  if (!userRow?.universityId) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Your account is not linked to a university yet — contact your admin.
      </div>
    );
  }

  const activeSession = await pgAcademicRepository.getActiveAcademicSession();

  // Tenant-scoped course catalog (the shared getActiveCourses helper is
  // platform-wide, so query directly with the university filter)
  const rows = await pgDb
    .select({
      id: CourseSchema.id,
      courseCode: CourseSchema.courseCode,
      title: CourseSchema.title,
      credits: CourseSchema.credits,
      level: CourseSchema.level,
      semesterOffered: CourseSchema.semesterOffered,
      departmentName: DepartmentSchema.name,
    })
    .from(CourseSchema)
    .leftJoin(
      DepartmentSchema,
      eq(CourseSchema.departmentId, DepartmentSchema.id),
    )
    .where(
      and(
        eq(CourseSchema.universityId, userRow.universityId),
        eq(CourseSchema.isActive, true),
      ),
    )
    .orderBy(CourseSchema.courseCode);

  const enrollments = activeSession
    ? await pgDb
        .select({
          courseId: StudentEnrollmentSchema.courseId,
          status: StudentEnrollmentSchema.status,
        })
        .from(StudentEnrollmentSchema)
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, session.user.id),
            eq(StudentEnrollmentSchema.semester, activeSession.currentSemester),
          ),
        )
    : [];

  const enrolledIds = new Set(
    enrollments.filter((e) => e.status === "enrolled").map((e) => e.courseId),
  );

  const courses: BrowsableCourse[] = rows.map((r) => ({
    ...r,
    enrolled: enrolledIds.has(r.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/student/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              My Courses
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Course Registration</h1>
            <p className="mt-1 text-muted-foreground">
              {activeSession
                ? `Enroll for ${activeSession.sessionName} — ${activeSession.currentSemester} semester`
                : "Enrollment is currently closed — no active session"}
            </p>
          </div>
        </div>
      </div>

      {activeSession ? (
        <CourseBrowser courses={courses} />
      ) : (
        <div className="rounded-lg border py-12 text-center text-muted-foreground">
          Check back when the new semester opens, or contact your department.
        </div>
      )}
    </div>
  );
}

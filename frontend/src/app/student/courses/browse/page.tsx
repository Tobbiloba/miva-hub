import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import {
  type BrowsableCourse,
  CourseBrowser,
} from "@/components/student/course-browser";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  CourseSchema,
  DepartmentSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { termKey } from "@/lib/utils/semester";
import { and, eq } from "drizzle-orm";
import { CalendarOff, ChevronLeft } from "lucide-react";
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

  const activeSession = await pgAcademicRepository.getActiveAcademicSession(
    userRow.universityId,
  );

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
            eq(
              StudentEnrollmentSchema.semester,
              termKey(activeSession.sessionName, activeSession.currentSemester),
            ),
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
      <div>
        <Link
          href="/student/courses"
          className="mb-3 inline-flex items-center gap-1 text-[13px] text-brand hover:underline"
        >
          <ChevronLeft className="size-4" />
          My Courses
        </Link>
        <PageHeader
          title="Course Registration"
          description={
            activeSession
              ? `Enroll for ${activeSession.sessionName}, ${activeSession.currentSemester} semester`
              : "Enrollment is closed: there's no active session"
          }
        />
      </div>

      {activeSession ? (
        <CourseBrowser courses={courses} />
      ) : (
        <EmptyState icon={<CalendarOff />} title="Enrollment is closed">
          Check back when the new semester opens, or contact your department.
        </EmptyState>
      )}
    </div>
  );
}

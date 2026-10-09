import { getApiSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getMemberScope } from "@/lib/tenant";
import { formatSemester, getCurrentSemester } from "@/lib/utils/semester";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticated + tenant-scoped: callers only ever see their own
    // university's catalogue (super_admin sees all). The middleware matcher
    // skips /api/courses, so the check lives here and answers 401 JSON.
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const scope = await getMemberScope(session.user.id);
    if (!scope.superAdmin && !scope.university) {
      return NextResponse.json(
        { error: "No university associated with your account" },
        { status: 403 },
      );
    }
    const universityId = scope.university?.id;

    // Get query parameters
    const departmentId = request.nextUrl.searchParams.get("departmentId");
    const level = request.nextUrl.searchParams.get("level");
    const semester = request.nextUrl.searchParams.get("semester");

    // Get active courses - filtered by department, level, and semester if provided
    const courses = (
      departmentId
        ? await pgAcademicRepository.getCoursesByDepartment(departmentId, {
            level: level ?? undefined,
            semester: semester ?? undefined,
          })
        : await pgAcademicRepository.getActiveCourses({
            level: level ?? undefined,
            semester: semester ?? undefined,
          })
    ).filter((course) => !universityId || course.universityId === universityId);

    // Current term per university (super_admin requests can span several)
    const termCache = new Map<string, Promise<string | null>>();
    const termFor = (id: string) => {
      if (!termCache.has(id)) termCache.set(id, getCurrentSemester(id));
      return termCache.get(id)!;
    };
    const currentTerm = universityId ? await termFor(universityId) : null;

    // Format for course selection consumption
    const formattedCourses = await Promise.all(
      courses.map(async (course) => {
        const term = await termFor(course.universityId);
        const [schedule, instructorInfo] = await Promise.all([
          pgAcademicRepository.getCourseSchedule(course.id, term),
          pgAcademicRepository.getCourseWithInstructor(course.id, term),
        ]);

        const instructor = instructorInfo[0];

        return {
          id: course.id,
          code: course.courseCode,
          title: course.title,
          description: course.description,
          credits: course.credits,
          level: course.level,
          semesterOffered: course.semesterOffered,
          schedule: schedule.map((s) => ({
            day: s.dayOfWeek,
            time: `${s.startTime}-${s.endTime}`,
            location: s.roomLocation,
            type: s.classType,
          })),
          instructor: instructor?.instructor
            ? {
                name: `Dr. ${instructor.instructor.userId}`, // This would need to be joined with user table in real implementation
                position: instructor.instructor.position,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      courses: formattedCourses,
      semester: currentTerm ? formatSemester(currentTerm) : "Current Semester",
    });
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch available courses" },
      { status: 500 },
    );
  }
}

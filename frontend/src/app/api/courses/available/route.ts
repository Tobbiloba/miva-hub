import { NextResponse, NextRequest } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function GET(request: NextRequest) {
  try {
    // Get departmentId from query params (optional)
    const departmentId = request.nextUrl.searchParams.get("departmentId");

    // Get active courses - filtered by department if provided
    const courses = departmentId
      ? await pgAcademicRepository.getCoursesByDepartment(departmentId)
      : await pgAcademicRepository.getActiveCourses();
    
    // Get current semester info
    const currentSemester = await pgAcademicRepository.getActiveAcademicCalendar();
    
    // Format for course selection consumption
    const formattedCourses = await Promise.all(
      courses.map(async (course) => {
        // Get course schedule if available
        const schedule = currentSemester 
          ? await pgAcademicRepository.getCourseSchedule(course.id, currentSemester.semester)
          : [];

        // Get course instructor info
        const instructorInfo = currentSemester
          ? await pgAcademicRepository.getCourseWithInstructor(course.id, currentSemester.semester)
          : [];

        const instructor = instructorInfo[0];

        return {
          id: course.id,
          code: course.courseCode,
          title: course.title,
          description: course.description,
          credits: course.credits,
          level: course.level,
          semesterOffered: course.semesterOffered,
          schedule: schedule.map(s => ({
            day: s.dayOfWeek,
            time: `${s.startTime}-${s.endTime}`,
            location: s.roomLocation,
            type: s.classType
          })),
          instructor: instructor?.instructor ? {
            name: `Dr. ${instructor.instructor.userId}`, // This would need to be joined with user table in real implementation
            position: instructor.instructor.position
          } : null
        };
      })
    );

    return NextResponse.json({
      courses: formattedCourses,
      semester: currentSemester?.semesterName || "Current Semester"
    });
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch available courses" },
      { status: 500 }
    );
  }
}
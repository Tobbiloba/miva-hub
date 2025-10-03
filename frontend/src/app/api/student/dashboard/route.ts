import { NextRequest, NextResponse } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { requireStudent } from "@/lib/auth/student";
import { getStudentId, getAcademicYear } from "@/lib/auth/user-utils";

export async function GET(request: NextRequest) {
  try {
    // Check student authentication
    const sessionOrError = await requireStudent();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }
    const session = sessionOrError;

    // Get student dashboard data
    const [
      enrollmentStats,
      courses,
      upcomingAssignments,
      recentAnnouncements,
      gradesSummary
    ] = await Promise.all([
      pgAcademicRepository.getStudentEnrollmentStats(session.user.id),
      pgAcademicRepository.getStudentCourses(session.user.id),
      pgAcademicRepository.getStudentUpcomingAssignments(session.user.id, 5),
      pgAcademicRepository.getStudentRecentAnnouncements(session.user.id, 5),
      pgAcademicRepository.getStudentGradesSummary(session.user.id)
    ]);

    // Calculate additional stats
    const completedAssignments = gradesSummary.length;
    const averageGrade = gradesSummary.length > 0 
      ? gradesSummary.reduce((sum, g) => sum + (Number(g.submission.grade) || 0), 0) / gradesSummary.length
      : 0;

    return NextResponse.json({
      student: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        studentId: getStudentId(session.user),
        academicYear: getAcademicYear(session.user),
      },
      stats: {
        enrolledCourses: enrollmentStats.enrolledCourses,
        totalCredits: enrollmentStats.totalCredits,
        upcomingAssignments: upcomingAssignments.length,
        completedAssignments,
        averageGrade: Number(averageGrade.toFixed(1))
      },
      courses: courses.slice(0, 4), // Limit to 4 for dashboard
      upcomingAssignments: upcomingAssignments,
      recentAnnouncements: recentAnnouncements,
      recentGrades: gradesSummary.slice(0, 3) // Latest 3 grades
    });

  } catch (error) {
    console.error("Error fetching student dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
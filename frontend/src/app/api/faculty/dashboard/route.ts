import { NextRequest, NextResponse } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { requireFaculty } from "@/lib/auth/faculty";

export async function GET(request: NextRequest) {
  try {
    // Check faculty authentication
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }
    const session = sessionOrError;

    // Get faculty record
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(session.user.id);
    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 404 }
      );
    }

    // Get faculty dashboard data
    const [
      dashboardStats,
      facultyCourses,
      gradingQueue,
      facultyStudents,
      recentAnnouncements
    ] = await Promise.all([
      pgAcademicRepository.getFacultyDashboardStats(facultyRecord.id),
      pgAcademicRepository.getFacultyCourses(facultyRecord.id),
      pgAcademicRepository.getFacultyGradingQueue(facultyRecord.id, 10),
      pgAcademicRepository.getFacultyStudents(facultyRecord.id),
      pgAcademicRepository.getAnnouncements(undefined, facultyRecord.departmentId, 5)
    ]);

    // Calculate additional metrics
    const upcomingDeadlines = await getUpcomingDeadlines(facultyRecord.id);
    const coursePerformance = await getCoursePerformanceMetrics(facultyRecord.id);

    return NextResponse.json({
      faculty: {
        id: facultyRecord.id,
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        position: facultyRecord.position,
        departmentId: facultyRecord.departmentId,
        officeLocation: facultyRecord.officeLocation,
        officeHours: facultyRecord.officeHours,
        isActive: facultyRecord.isActive,
      },
      stats: {
        activeCourses: dashboardStats.activeCourses,
        totalStudents: dashboardStats.totalStudents,
        pendingGrades: dashboardStats.pendingGrades,
        recentSubmissions: dashboardStats.recentSubmissions,
        upcomingDeadlines: upcomingDeadlines.length,
      },
      courses: facultyCourses.slice(0, 6), // Limit for dashboard
      gradingQueue: gradingQueue,
      students: facultyStudents.slice(0, 10), // Recent students
      recentAnnouncements: recentAnnouncements,
      upcomingDeadlines: upcomingDeadlines,
      coursePerformance: coursePerformance,
    });

  } catch (error) {
    console.error("Error fetching faculty dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Helper function to get upcoming assignment deadlines
async function getUpcomingDeadlines(facultyId: string) {
  try {
    const assignments = await pgAcademicRepository.getFacultyAssignments(facultyId);
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return assignments
      .filter(({ assignment }) => {
        const dueDate = new Date(assignment.dueDate);
        return dueDate > now && dueDate <= oneWeekFromNow;
      })
      .slice(0, 5); // Limit to 5 upcoming deadlines
  } catch (error) {
    console.error("Error fetching upcoming deadlines:", error);
    return [];
  }
}

// Helper function to get course performance metrics
async function getCoursePerformanceMetrics(facultyId: string) {
  try {
    const facultyCourses = await pgAcademicRepository.getFacultyCourses(facultyId);
    
    const { getCurrentSemester } = await import("@/lib/utils/semester");
    const currentSemester = await getCurrentSemester();
    
    const courseMetrics = await Promise.all(
      facultyCourses.map(async ({ course }) => {
        const stats = await pgAcademicRepository.getCourseStatistics(
          course.id, 
          currentSemester
        );
        
        return {
          courseId: course.id,
          courseCode: course.courseCode,
          courseName: course.title,
          ...stats
        };
      })
    );
    
    return courseMetrics;
  } catch (error) {
    console.error("Error fetching course performance metrics:", error);
    return [];
  }
}
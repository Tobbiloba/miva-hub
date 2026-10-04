/**
 * Academic Analytics Service
 * Provides comprehensive analytics for MIVA University academic system
 */

import { pgAcademicRepository } from "lib/db/pg/repositories/academic-repository.pg";
import { getCurrentSemester } from "lib/utils/semester";
import { safe } from "ts-safe";

/**
 * Tenant scope for every analytics query: a universityId (university
 * admins) or "all" (super_admin only, platform-wide). Required on every
 * entry point and part of every cache key so one tenant's numbers can never
 * be served to another.
 */
export type AnalyticsScope = string | "all";

const inScope = (scope: AnalyticsScope, universityId: string) =>
  scope === "all" || universityId === scope;

// Types for analytics data
export interface SystemOverview {
  totalStudents: number;
  totalCourses: number;
  totalFaculty: number;
  totalDepartments: number;
  totalMaterials: number;
  activeSemester: string;
}

export interface CourseAnalytics {
  courseId: string;
  courseCode: string;
  courseName: string;
  enrolledStudents: number;
  totalAssignments: number;
  averageGrade: number;
  submissionRate: number;
  departmentName: string;
  facultyName: string;
}

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  email: string;
  totalCourses: number;
  averageGrade: number;
  submissionsCompleted: number;
  submissionsPending: number;
  academicStanding: "excellent" | "good" | "satisfactory" | "needs_improvement";
}

export interface FacultyAnalytics {
  facultyId: string;
  facultyName: string;
  department: string;
  coursesTeaching: number;
  totalStudents: number;
  assignmentsCreated: number;
  gradingWorkload: number;
  averageResponseTime: number; // days
}

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  totalCourses: number;
  totalStudents: number;
  totalFaculty: number;
  averageGrade: number;
  enrollmentTrend: "increasing" | "stable" | "decreasing";
}

export interface LearningInsights {
  popularCourses: Array<{ courseCode: string; enrollmentCount: number }>;
  difficultCourses: Array<{ courseCode: string; averageGrade: number }>;
  engagementMetrics: {
    averageSubmissionRate: number;
    onTimeSubmissionRate: number;
    studentParticipation: number;
  };
  performanceTrends: {
    currentSemesterAverage: number;
    previousSemesterAverage: number;
    improvementRate: number;
  };
}

export interface AssignmentAnalytics {
  assignmentId: string;
  title: string;
  courseCode: string;
  totalSubmissions: number;
  gradedSubmissions: number;
  pendingSubmissions: number;
  lateSubmissions: number;
  averageGrade: number;
  submissionRate: number;
  dueDate: string;
  status: "upcoming" | "active" | "closed" | "grading";
}

class AcademicAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get system overview analytics
   */
  async getSystemOverview(scope: AnalyticsScope): Promise<SystemOverview> {
    return this.cached(`${scope}:system-overview`, async () => {
      const [systemStats, currentSemester] = await Promise.all([
        pgAcademicRepository.getSystemStats(scope),
        getCurrentSemester(),
      ]);

      return {
        totalStudents: systemStats.students,
        totalCourses: systemStats.courses,
        totalFaculty: systemStats.faculty,
        totalDepartments: systemStats.departments,
        totalMaterials: systemStats.materials,
        activeSemester: currentSemester,
      };
    });
  }

  /**
   * Get course analytics for all courses or specific department
   */
  async getCourseAnalytics(
    scope: AnalyticsScope,
    departmentId?: string,
  ): Promise<CourseAnalytics[]> {
    const cacheKey = `${scope}:course-analytics-${departmentId || "all"}`;

    return this.cached(cacheKey, async () => {
      try {
        const currentSemester = await getCurrentSemester();

        // Get all active courses (tenant-scoped — departmentId comes from
        // the query string, so foreign departments simply yield nothing)
        const courses = (
          departmentId
            ? await pgAcademicRepository.getCoursesByDepartment(departmentId)
            : await pgAcademicRepository.getActiveCourses()
        ).filter((course) => inScope(scope, course.universityId));

        const courseAnalytics = await Promise.all(
          courses.map(async (course) => {
            const [stats, instructors] = await Promise.all([
              pgAcademicRepository.getCourseStatistics(
                course.id,
                currentSemester,
              ),
              pgAcademicRepository.getCourseInstructors(
                course.id,
                currentSemester,
              ),
            ]);

            return {
              courseId: course.id,
              courseCode: course.courseCode,
              courseName: course.title,
              enrolledStudents: stats.enrolledStudents,
              totalAssignments: stats.totalAssignments,
              averageGrade: stats.averageGrade,
              submissionRate: stats.submissionRate,
              departmentName: course.departmentId, // Would need to join with department
              facultyName: instructors?.[0]?.user?.name || "TBA",
            };
          }),
        );

        return courseAnalytics;
      } catch (error) {
        console.error("[Analytics] Failed to get course analytics:", error);
        return [];
      }
    });
  }

  /**
   * Get student performance analytics
   */
  async getStudentPerformance(
    scope: AnalyticsScope,
    limit: number = 50,
  ): Promise<StudentPerformance[]> {
    const cacheKey = `${scope}:student-performance-${limit}`;

    return this.cached(cacheKey, async () => {
      try {
        // This would need to be implemented in the academic repository
        // For now, return empty array
        console.log(
          "[Analytics] Student performance analytics not yet implemented",
        );
        return [];
      } catch (error) {
        console.error("[Analytics] Failed to get student performance:", error);
        return [];
      }
    });
  }

  /**
   * Get faculty analytics
   */
  async getFacultyAnalytics(
    scope: AnalyticsScope,
    departmentId?: string,
  ): Promise<FacultyAnalytics[]> {
    const cacheKey = `${scope}:faculty-analytics-${departmentId || "all"}`;

    return this.cached(cacheKey, async () => {
      try {
        // Get faculty members — only for a department in the tenant
        const department = departmentId
          ? await pgAcademicRepository.getDepartmentById(departmentId)
          : null;
        const faculty =
          department && inScope(scope, department.universityId)
            ? await pgAcademicRepository.getFacultyByDepartment(department.id)
            : []; // Would need a method to get all faculty

        const facultyAnalytics = await Promise.all(
          faculty.map(async (member) => {
            const assignments =
              await pgAcademicRepository.getFacultyAssignmentsWithStatistics(
                member.id,
              );

            // Calculate metrics
            const coursesTeaching = [
              ...new Set(assignments.map((a) => a.assignment.courseId)),
            ].length;
            // Enrollment counts are not returned by getFacultyAssignmentsWithStatistics;
            // computing this requires a dedicated enrollment query (not yet implemented).
            const totalStudents = 0;
            const assignmentsCreated = assignments.length;
            const gradingWorkload = assignments.reduce(
              (sum, a) => sum + (a.submissionStats?.pendingSubmissions || 0),
              0,
            );

            return {
              facultyId: member.id,
              facultyName: member.name || "Unknown",
              department: member.departmentId || "Unknown", // Would need to join with department name
              coursesTeaching,
              totalStudents,
              assignmentsCreated,
              gradingWorkload,
              averageResponseTime: 2.5, // Placeholder - would calculate from grading timestamps
            };
          }),
        );

        return facultyAnalytics;
      } catch (error) {
        console.error("[Analytics] Failed to get faculty analytics:", error);
        return [];
      }
    });
  }

  /**
   * Get department analytics
   */
  async getDepartmentAnalytics(
    scope: AnalyticsScope,
  ): Promise<DepartmentAnalytics[]> {
    return this.cached(`${scope}:department-analytics`, async () => {
      try {
        const departments = await pgAcademicRepository.getDepartments(
          scope === "all" ? undefined : scope,
        );
        const currentSemester = await getCurrentSemester();

        const departmentAnalytics = await Promise.all(
          departments.map(async (dept) => {
            const [courses, faculty] = await Promise.all([
              pgAcademicRepository.getCoursesByDepartment(dept.id),
              pgAcademicRepository.getFacultyByDepartment(dept.id),
            ]);

            // Calculate course statistics
            const courseStats = await Promise.all(
              courses.map((course) =>
                pgAcademicRepository.getCourseStatistics(
                  course.id,
                  currentSemester,
                ),
              ),
            );

            const totalStudents = courseStats.reduce(
              (sum, stats) => sum + stats.enrolledStudents,
              0,
            );
            const averageGrade =
              courseStats.length > 0
                ? courseStats.reduce(
                    (sum, stats) => sum + stats.averageGrade,
                    0,
                  ) / courseStats.length
                : 0;

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              totalCourses: courses.length,
              totalStudents,
              totalFaculty: faculty.length,
              averageGrade,
              enrollmentTrend: "stable" as const, // Would calculate from historical data
            };
          }),
        );

        return departmentAnalytics;
      } catch (error) {
        console.error("[Analytics] Failed to get department analytics:", error);
        return [];
      }
    });
  }

  /**
   * Get learning insights and trends
   */
  async getLearningInsights(scope: AnalyticsScope): Promise<LearningInsights> {
    return this.cached(`${scope}:learning-insights`, async () => {
      try {
        const currentSemester = await getCurrentSemester();
        const courses = (await pgAcademicRepository.getActiveCourses()).filter(
          (course) => inScope(scope, course.universityId),
        );

        // Get course statistics for insights
        const courseStats = await Promise.all(
          courses.map(async (course) => {
            const stats = await pgAcademicRepository.getCourseStatistics(
              course.id,
              currentSemester,
            );
            return {
              courseCode: course.courseCode,
              title: course.title,
              enrollmentCount: stats.enrolledStudents,
              averageGrade: stats.averageGrade,
              submissionRate: stats.submissionRate,
            };
          }),
        );

        // Calculate insights
        const popularCourses = courseStats
          .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
          .slice(0, 5)
          .map((course) => ({
            courseCode: course.courseCode,
            enrollmentCount: course.enrollmentCount,
          }));

        const difficultCourses = courseStats
          .filter((course) => course.averageGrade > 0)
          .sort((a, b) => a.averageGrade - b.averageGrade)
          .slice(0, 5)
          .map((course) => ({
            courseCode: course.courseCode,
            averageGrade: course.averageGrade,
          }));

        const averageSubmissionRate =
          courseStats.length > 0
            ? courseStats.reduce(
                (sum, course) => sum + course.submissionRate,
                0,
              ) / courseStats.length
            : 0;

        const currentSemesterAverage =
          courseStats.length > 0
            ? courseStats.reduce(
                (sum, course) => sum + course.averageGrade,
                0,
              ) / courseStats.length
            : 0;

        return {
          popularCourses,
          difficultCourses,
          engagementMetrics: {
            averageSubmissionRate,
            onTimeSubmissionRate: 85, // Placeholder - would calculate from late submissions
            studentParticipation: 78, // Placeholder - would calculate from activity data
          },
          performanceTrends: {
            currentSemesterAverage,
            previousSemesterAverage: currentSemesterAverage * 0.95, // Placeholder
            improvementRate: 5.2, // Placeholder
          },
        };
      } catch (error) {
        console.error("[Analytics] Failed to get learning insights:", error);
        return {
          popularCourses: [],
          difficultCourses: [],
          engagementMetrics: {
            averageSubmissionRate: 0,
            onTimeSubmissionRate: 0,
            studentParticipation: 0,
          },
          performanceTrends: {
            currentSemesterAverage: 0,
            previousSemesterAverage: 0,
            improvementRate: 0,
          },
        };
      }
    });
  }

  /**
   * Get assignment analytics
   */
  async getAssignmentAnalytics(
    scope: AnalyticsScope,
    courseId?: string,
  ): Promise<AssignmentAnalytics[]> {
    const cacheKey = `${scope}:assignment-analytics-${courseId || "all"}`;

    return this.cached(cacheKey, async () => {
      try {
        // This would need implementation in academic repository
        console.log(
          "[Analytics] Assignment analytics not yet fully implemented",
        );
        return [];
      } catch (error) {
        console.error("[Analytics] Failed to get assignment analytics:", error);
        return [];
      }
    });
  }

  /**
   * Get real-time statistics for dashboard
   */
  async getRealTimeStats(scope: AnalyticsScope) {
    return this.cached(`${scope}:realtime-stats`, async () => {
      try {
        const [systemStats, currentSemester] = await Promise.all([
          pgAcademicRepository.getSystemStats(scope),
          getCurrentSemester(),
        ]);

        // Get today's activity (placeholder - would track actual activity)
        const todaysActivity = {
          newSubmissions: 12,
          gradesPosted: 8,
          newEnrollments: 3,
          activeUsers: 45,
        };

        return {
          ...systemStats,
          currentSemester,
          todaysActivity,
        };
      } catch (error) {
        console.error("[Analytics] Failed to get real-time stats:", error);
        return null;
      }
    });
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Private helper for caching
   */
  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });

    // Auto-expire cache
    setTimeout(() => {
      this.cache.delete(key);
    }, this.cacheTTL);

    return data;
  }
}

// Singleton instance
export const academicAnalytics = new AcademicAnalyticsService();

/**
 * Helper functions for safe analytics calls
 */
export const getSystemOverview = (scope: AnalyticsScope) =>
  safe(() => academicAnalytics.getSystemOverview(scope)).orElse({
    totalStudents: 0,
    totalCourses: 0,
    totalFaculty: 0,
    totalDepartments: 0,
    totalMaterials: 0,
    activeSemester: "N/A",
  });

export const getCourseAnalytics = (
  scope: AnalyticsScope,
  departmentId?: string,
) =>
  safe(() => academicAnalytics.getCourseAnalytics(scope, departmentId)).orElse(
    [],
  );

export const getLearningInsights = (scope: AnalyticsScope) =>
  safe(() => academicAnalytics.getLearningInsights(scope)).orElse({
    popularCourses: [],
    difficultCourses: [],
    engagementMetrics: {
      averageSubmissionRate: 0,
      onTimeSubmissionRate: 0,
      studentParticipation: 0,
    },
    performanceTrends: {
      currentSemesterAverage: 0,
      previousSemesterAverage: 0,
      improvementRate: 0,
    },
  });

export const getDepartmentAnalytics = (scope: AnalyticsScope) =>
  safe(() => academicAnalytics.getDepartmentAnalytics(scope)).orElse([]);

export const getFacultyAnalytics = (
  scope: AnalyticsScope,
  departmentId?: string,
) =>
  safe(() => academicAnalytics.getFacultyAnalytics(scope, departmentId)).orElse(
    [],
  );

export const getRealTimeStats = (scope: AnalyticsScope) =>
  safe(() => academicAnalytics.getRealTimeStats(scope)).orElse(null);

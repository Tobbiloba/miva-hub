import { tool as createTool } from "ai";
import { z } from "zod";
// pgAcademicRepository not used in this implementation
import { pgDb } from "../../../db/pg/db.pg";
import { 
  StudentEnrollmentSchema, 
  CourseSchema, 
  AssignmentSchema 
} from "../../../db/pg/schema.pg";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { safe } from "ts-safe";

/**
 * Assignment Tracker Tool - Gets upcoming assignments with urgency classification
 * Shows assignments across all enrolled courses with intelligent prioritization
 */

const assignmentTrackerSchema = z.object({
  userId: z.string().describe("Student user ID"),
  daysAhead: z.number().optional().default(30).describe("Number of days to look ahead (default: 30)"),
  courseCode: z.string().optional().describe("Filter by specific course code"),
  includeCompleted: z.boolean().optional().default(false).describe("Include completed assignments")
});

type AssignmentUrgency = 'overdue' | 'urgent' | 'soon' | 'later';

export const assignmentTrackerTool = createTool({
  description: "Get upcoming assignments and deadlines across enrolled courses with urgency prioritization",
  inputSchema: assignmentTrackerSchema,
  execute: async ({ userId, daysAhead, courseCode, includeCompleted }) => {
    return safe(async () => {
      // Get user's enrolled courses
      let enrollmentsQuery = pgDb
        .select({
          course: CourseSchema,
          enrollment: StudentEnrollmentSchema
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(CourseSchema, eq(CourseSchema.id, StudentEnrollmentSchema.courseId))
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.status, 'enrolled')
          )
        );

      // Filter by specific course if requested
      if (courseCode) {
        enrollmentsQuery = pgDb
          .select({
            course: CourseSchema,
            enrollment: StudentEnrollmentSchema
          })
          .from(StudentEnrollmentSchema)
          .innerJoin(CourseSchema, eq(CourseSchema.id, StudentEnrollmentSchema.courseId))
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, userId),
              eq(StudentEnrollmentSchema.status, 'enrolled'),
              eq(CourseSchema.courseCode, courseCode.toUpperCase())
            )
          );
      }

      const enrollments = await enrollmentsQuery;

      if (enrollments.length === 0) {
        return {
          message: courseCode 
            ? `You are not enrolled in ${courseCode}` 
            : "You are not enrolled in any courses",
          assignments: [],
          summary: "No assignments found",
          totalAssignments: 0,
          timeRange: `Next ${daysAhead} days`,
          courseFilter: courseCode || "All enrolled courses"
        };
      }

      // Calculate date range
      const now = new Date();
      const cutoffDate = new Date(Date.now() + (daysAhead * 24 * 60 * 60 * 1000));
      const courseIds = enrollments.map(e => e.course.id);

      // Get assignments from enrolled courses
      let assignmentsQuery = pgDb
        .select({
          assignment: AssignmentSchema,
          course: CourseSchema
        })
        .from(AssignmentSchema)
        .innerJoin(CourseSchema, eq(CourseSchema.id, AssignmentSchema.courseId))
        .where(
          and(
            inArray(AssignmentSchema.courseId, courseIds),
            eq(AssignmentSchema.isPublished, true),
            lte(AssignmentSchema.dueDate, cutoffDate)
          )
        )
        .orderBy(AssignmentSchema.dueDate);

      // Include future assignments only unless includeCompleted is true
      if (!includeCompleted) {
        assignmentsQuery = pgDb
          .select({
            assignment: AssignmentSchema,
            course: CourseSchema
          })
          .from(AssignmentSchema)
          .innerJoin(CourseSchema, eq(CourseSchema.id, AssignmentSchema.courseId))
          .where(
            and(
              inArray(AssignmentSchema.courseId, courseIds),
              eq(AssignmentSchema.isPublished, true),
              gte(AssignmentSchema.dueDate, now),
              lte(AssignmentSchema.dueDate, cutoffDate)
            )
          )
          .orderBy(AssignmentSchema.dueDate);
      }

      const assignments = await assignmentsQuery;

      // Format assignments with urgency classification
      const formattedAssignments = assignments.map(item => {
        const assignment = item.assignment;
        const course = item.course;
        const dueDate = new Date(assignment.dueDate!);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Classify urgency
        let urgency: AssignmentUrgency = 'later';
        if (daysUntilDue < 0) urgency = 'overdue';
        else if (daysUntilDue <= 1) urgency = 'urgent';
        else if (daysUntilDue <= 3) urgency = 'soon';

        return {
          id: assignment.id,
          course: {
            code: course.courseCode,
            title: course.title,
            credits: course.credits
          },
          title: assignment.title,
          description: assignment.description,
          instructions: assignment.instructions,
          dueDate: assignment.dueDate,
          dueDateFormatted: dueDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          daysUntilDue,
          urgency,
          totalPoints: assignment.totalPoints,
          assignmentType: assignment.assignmentType,
          submissionType: assignment.submissionType,
          allowLateSubmission: assignment.allowLateSubmission,
          lateSubmissionPenalty: assignment.lateSubmissionPenalty,
          week: assignment.weekNumber,
          isPublished: assignment.isPublished
        };
      });

      // Group by urgency for better presentation
      const groupedByUrgency = formattedAssignments.reduce((acc, assignment) => {
        if (!acc[assignment.urgency]) {
          acc[assignment.urgency] = [];
        }
        acc[assignment.urgency].push(assignment);
        return acc;
      }, {} as Record<AssignmentUrgency, typeof formattedAssignments>);

      // Sort each urgency group by due date
      Object.keys(groupedByUrgency).forEach(urgency => {
        groupedByUrgency[urgency as AssignmentUrgency].sort((a, b) => 
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        );
      });

      const summary = generateAssignmentsSummary(formattedAssignments, daysAhead, courseCode);

      return {
        totalAssignments: formattedAssignments.length,
        timeRange: `Next ${daysAhead} days`,
        courseFilter: courseCode || "All enrolled courses",
        assignments: formattedAssignments,
        groupedByUrgency,
        summary,
        urgencyBreakdown: {
          overdue: groupedByUrgency.overdue?.length || 0,
          urgent: groupedByUrgency.urgent?.length || 0,
          soon: groupedByUrgency.soon?.length || 0,
          later: groupedByUrgency.later?.length || 0
        },
        enrolledCourses: enrollments.map(e => ({
          code: e.course.courseCode,
          title: e.course.title,
          credits: e.course.credits
        }))
      };

    }).ifFail((error) => {
      console.error("Assignment tracker tool error:", error);
      return {
        isError: true,
        error: error.message,
        solution: "There was a problem accessing assignment data. Please try again or contact IT support if the issue persists."
      };
    }).unwrap();
  }
});

/**
 * Generate a human-readable summary of assignments
 */
function generateAssignmentsSummary(
  assignments: any[], 
  daysAhead: number, 
  courseCode?: string
): string {
  if (assignments.length === 0) {
    return `No assignments due in the next ${daysAhead} days${courseCode ? ` for ${courseCode}` : ''}`;
  }

  const urgentCount = assignments.filter(a => a.urgency === 'urgent').length;
  const overdueCount = assignments.filter(a => a.urgency === 'overdue').length;
  const soonCount = assignments.filter(a => a.urgency === 'soon').length;

  let summary = `You have ${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} due in the next ${daysAhead} days`;
  
  if (courseCode) {
    summary += ` for ${courseCode}`;
  }

  const urgencyParts: string[] = [];
  if (overdueCount > 0) urgencyParts.push(`${overdueCount} overdue`);
  if (urgentCount > 0) urgencyParts.push(`${urgentCount} urgent`);
  if (soonCount > 0) urgencyParts.push(`${soonCount} due soon`);

  if (urgencyParts.length > 0) {
    summary += ` (${urgencyParts.join(', ')})`;
  }

  // Add priority recommendation
  if (overdueCount > 0) {
    summary += '. ⚠️ PRIORITY: Complete overdue assignments immediately!';
  } else if (urgentCount > 0) {
    summary += '. 🔥 Focus on urgent assignments due within 24 hours.';
  } else if (soonCount > 0) {
    summary += '. ⏰ Plan to complete assignments due in the next 3 days.';
  } else {
    summary += '. ✅ No urgent deadlines - good time to plan ahead!';
  }

  return summary;
}
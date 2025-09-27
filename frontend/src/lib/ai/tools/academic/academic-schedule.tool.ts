import { tool as createTool } from "ai";
import { z } from "zod";
// pgAcademicRepository imported but not used - for future enhancements
import { pgDb } from "../../../db/pg/db.pg";
import { 
  StudentEnrollmentSchema, 
  CourseSchema, 
  AssignmentSchema,
  ClassScheduleSchema,
  AnnouncementSchema
} from "../../../db/pg/schema.pg";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { safe } from "ts-safe";

/**
 * Academic Schedule Tool - Get class schedules, academic calendar events, and important dates
 * Shows comprehensive schedule across enrolled courses with event classification
 */

const academicScheduleSchema = z.object({
  userId: z.string().describe("Student user ID"),
  date: z.string().optional().describe("Specific date (YYYY-MM-DD) or 'today', 'tomorrow', 'this-week'"),
  courseCode: z.string().optional().describe("Filter by specific course"),
  eventType: z.enum(["class", "assignment", "announcement", "all"]).optional().default("all").describe("Type of events to show"),
  daysAhead: z.number().optional().default(7).describe("Number of days to look ahead (default: 7)")
});

interface ScheduleEvent {
  id: string;
  type: 'class' | 'assignment' | 'announcement' | 'calendar';
  title: string;
  description: string;
  course?: {
    code: string;
    title: string;
  };
  startTime: Date;
  endTime?: Date;
  location?: string;
  isRecurring?: boolean;
  urgency?: 'high' | 'medium' | 'low';
  dueDate?: Date;
}

export const academicScheduleTool = createTool({
  description: "Get class schedule, academic calendar events, and important dates with flexible filtering",
  inputSchema: academicScheduleSchema,
  execute: async ({ userId, date, courseCode, eventType, daysAhead }) => {
    return safe(async () => {
      // Parse date parameter to get date range
      const { startDate, endDate, dateLabel } = parseDateRange(date, daysAhead);
      
      // Get user's enrolled courses
      const enrollmentsQuery = pgDb
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

      const enrollments = await enrollmentsQuery;

      if (enrollments.length === 0) {
        return {
          message: "You are not enrolled in any courses",
          schedule: [],
          summary: "No schedule to display",
          dateRange: dateLabel
        };
      }

      const enrolledCourses = enrollments.map(e => e.course);
      
      // Filter by specific course if requested
      const coursesToShow = courseCode 
        ? enrolledCourses.filter(c => c.courseCode.toLowerCase() === courseCode.toLowerCase())
        : enrolledCourses;

      if (courseCode && coursesToShow.length === 0) {
        return {
          error: `You are not enrolled in ${courseCode}`,
          enrolledCourses: enrolledCourses.map(c => c.courseCode)
        };
      }

      const scheduleEvents: ScheduleEvent[] = [];

      // Add class sessions if requested
      if (eventType === "all" || eventType === "class") {
        const classEvents = await generateClassSessions(coursesToShow, startDate, endDate);
        scheduleEvents.push(...classEvents);
      }

      // Add assignment due dates if requested
      if (eventType === "all" || eventType === "assignment") {
        const assignmentEvents = await getAssignmentEvents(coursesToShow, startDate, endDate);
        scheduleEvents.push(...assignmentEvents);
      }

      // Add announcements if requested
      if (eventType === "all" || eventType === "announcement") {
        const announcementEvents = await getAnnouncementEvents(coursesToShow, startDate, endDate);
        scheduleEvents.push(...announcementEvents);
      }

      // Sort events by date and time
      scheduleEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Group events by date for better presentation
      const eventsByDate = groupEventsByDate(scheduleEvents);
      const summary = generateScheduleSummary(scheduleEvents, dateLabel, courseCode);

      return {
        dateRange: dateLabel,
        courseFilter: courseCode || "All enrolled courses",
        eventType,
        totalEvents: scheduleEvents.length,
        events: scheduleEvents,
        eventsByDate,
        summary,
        enrolledCourses: coursesToShow.map(c => ({
          code: c.courseCode,
          title: c.title,
          credits: c.credits
        }))
      };

    }).ifFail((error) => {
      console.error("Academic schedule tool error:", error);
      return {
        isError: true,
        error: error.message,
        solution: "There was a problem accessing your academic schedule. Please try again or contact IT support if the issue persists."
      };
    }).unwrap();
  }
});

/**
 * Parse date parameter into start and end dates
 */
function parseDateRange(date?: string, daysAhead: number = 7) {
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  let dateLabel = "";

  startDate.setHours(0, 0, 0, 0);

  if (!date || date === 'today') {
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    dateLabel = "Today";
  } else if (date === 'tomorrow') {
    startDate.setDate(now.getDate() + 1);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    dateLabel = "Tomorrow";
  } else if (date === 'this-week') {
    // Start from Monday of current week
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(now.getDate() + daysToMonday);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    dateLabel = "This Week";
  } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Specific date provided
    startDate = new Date(date);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    dateLabel = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  } else {
    // Default to next N days
    endDate.setDate(startDate.getDate() + daysAhead);
    dateLabel = `Next ${daysAhead} days`;
  }

  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate, dateLabel };
}

/**
 * Generate class sessions for the date range
 */
async function generateClassSessions(courses: any[], startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
  const events: ScheduleEvent[] = [];
  
  for (const course of courses) {
    const schedules = await pgDb
      .select()
      .from(ClassScheduleSchema)
      .where(eq(ClassScheduleSchema.courseId, course.id));

    for (const schedule of schedules) {
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        if (schedule.dayOfWeek.toLowerCase() === dayName) {
          const [startHour, startMin] = schedule.startTime.split(':').map(Number);
          const [endHour, endMin] = schedule.endTime.split(':').map(Number);
          
          const eventStart = new Date(currentDate);
          eventStart.setHours(startHour, startMin, 0, 0);
          
          const eventEnd = new Date(currentDate);
          eventEnd.setHours(endHour, endMin, 0, 0);

          events.push({
            id: `class-${course.id}-${currentDate.toISOString().split('T')[0]}`,
            type: 'class',
            title: `${course.courseCode} - ${course.title}`,
            description: `${schedule.classType} session`,
            course: {
              code: course.courseCode,
              title: course.title
            },
            startTime: eventStart,
            endTime: eventEnd,
            location: schedule.roomLocation || 'TBA',
            isRecurring: true
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }
  
  return events;
}

/**
 * Get assignment events for the date range
 */
async function getAssignmentEvents(courses: any[], startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
  const courseIds = courses.map(c => c.id);
  
  const assignments = await pgDb
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
        gte(AssignmentSchema.dueDate, startDate),
        lte(AssignmentSchema.dueDate, endDate)
      )
    );

  return assignments.map(item => {
    const assignment = item.assignment;
    const course = item.course;
    const dueDate = new Date(assignment.dueDate!);
    
    // Determine urgency based on days until due
    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    let urgency: 'high' | 'medium' | 'low' = 'low';
    if (daysUntilDue <= 1) urgency = 'high';
    else if (daysUntilDue <= 3) urgency = 'medium';

    return {
      id: `assignment-${assignment.id}`,
      type: 'assignment' as const,
      title: `${course.courseCode}: ${assignment.title}`,
      description: assignment.description || 'Assignment due',
      course: {
        code: course.courseCode,
        title: course.title
      },
      startTime: dueDate,
      dueDate,
      urgency
    };
  });
}

/**
 * Get announcement events for the date range
 */
async function getAnnouncementEvents(courses: any[], startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
  const courseIds = courses.map(c => c.id);
  
  const announcements = await pgDb
    .select({
      announcement: AnnouncementSchema,
      course: CourseSchema
    })
    .from(AnnouncementSchema)
    .innerJoin(CourseSchema, eq(CourseSchema.id, AnnouncementSchema.courseId))
    .where(
      and(
        inArray(AnnouncementSchema.courseId, courseIds),
        eq(AnnouncementSchema.isActive, true),
        gte(AnnouncementSchema.createdAt, startDate),
        lte(AnnouncementSchema.createdAt, endDate)
      )
    );

  return announcements.map(item => ({
    id: `announcement-${item.announcement.id}`,
    type: 'announcement' as const,
    title: `${item.course.courseCode}: ${item.announcement.title}`,
    description: item.announcement.content,
    course: {
      code: item.course.courseCode,
      title: item.course.title
    },
    startTime: new Date(item.announcement.createdAt),
    urgency: item.announcement.priority as 'high' | 'medium' | 'low'
  }));
}

/**
 * Group events by date for better presentation
 */
function groupEventsByDate(events: ScheduleEvent[]) {
  return events.reduce((acc, event) => {
    const dateKey = event.startTime.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, ScheduleEvent[]>);
}

/**
 * Generate schedule summary
 */
function generateScheduleSummary(events: ScheduleEvent[], dateLabel: string, courseCode?: string): string {
  if (events.length === 0) {
    return `No events scheduled for ${dateLabel}${courseCode ? ` in ${courseCode}` : ''}`;
  }

  const eventCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const parts: string[] = [];
  if (eventCounts.class) parts.push(`${eventCounts.class} class${eventCounts.class > 1 ? 'es' : ''}`);
  if (eventCounts.assignment) parts.push(`${eventCounts.assignment} assignment${eventCounts.assignment > 1 ? 's' : ''} due`);
  if (eventCounts.announcement) parts.push(`${eventCounts.announcement} announcement${eventCounts.announcement > 1 ? 's' : ''}`);

  return `You have ${parts.join(', ')} ${dateLabel.toLowerCase()}${courseCode ? ` for ${courseCode}` : ''}`;
}
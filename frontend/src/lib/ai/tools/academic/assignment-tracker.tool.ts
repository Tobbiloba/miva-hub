import { tool as createTool } from "ai";
import { and, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "lib/db/pg/schema.pg";
import { type Deadline, listDeadlines } from "lib/deadlines";
import { formatStudentTime } from "lib/deadlines/time";
import { z } from "zod";

/**
 * The student's deadlines, from lib/deadlines: lecturer assignments,
 * assignment/quiz pages captured from their LMS, and deadlines they added.
 * Bound to the signed-in student: the user id comes from the session, never
 * from model input.
 */

const DAY = 24 * 60 * 60 * 1000;

type Urgency = "overdue" | "urgent" | "soon" | "later";

function urgencyOf(d: Deadline, now: number): Urgency {
  const left = d.dueAt.getTime() - now;
  if (left < 0) return "overdue";
  if (left <= DAY) return "urgent";
  if (left <= 3 * DAY) return "soon";
  return "later";
}

export function formatDeadlineForModel(d: Deadline, now = Date.now()) {
  return {
    key: d.key,
    title: d.title,
    course: d.course ? `${d.course.code}: ${d.course.title}` : null,
    due: formatStudentTime(d.dueAt),
    dueAt: d.dueAt.toISOString(),
    daysLeft: Math.floor((d.dueAt.getTime() - now) / DAY),
    urgency: urgencyOf(d, now),
    done: d.done,
    source:
      d.kind === "assignment"
        ? "lecturer assignment"
        : d.kind === "lms"
          ? "captured from the LMS"
          : "added by the student",
    notes: d.notes,
  };
}

export const createAssignmentTrackerTool = (userId: string) =>
  createTool({
    description:
      "Get the student's deadlines: assignments and quizzes captured from their LMS, lecturer assignments, and deadlines they added. Includes overdue ones. Use for anything about what's due, deadlines, or planning their week.",
    inputSchema: z.object({
      daysAhead: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .default(30)
        .describe("How many days ahead to look (default 30)"),
      courseCode: z
        .string()
        .optional()
        .describe("Only this course (one of the student's course codes)"),
      includeDone: z
        .boolean()
        .optional()
        .default(false)
        .describe("Also include deadlines already done"),
    }),
    execute: async ({ daysAhead, courseCode, includeDone }) => {
      let courseId: string | undefined;
      if (courseCode) {
        const [course] = await pgDb
          .select({ id: CourseSchema.id })
          .from(StudentEnrollmentSchema)
          .innerJoin(
            CourseSchema,
            eq(CourseSchema.id, StudentEnrollmentSchema.courseId),
          )
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, userId),
              eq(StudentEnrollmentSchema.status, "enrolled"),
              eq(CourseSchema.courseCode, courseCode.trim().toUpperCase()),
            ),
          )
          .limit(1);
        // An unknown code shouldn't hide everything: show all, and say so
        courseId = course?.id;
      }

      const now = Date.now();
      const deadlines = await listDeadlines(userId, {
        // Overdue items from the last two weeks are still actionable
        from: new Date(now - 14 * DAY),
        to: new Date(now + daysAhead * DAY),
        includeDone,
        courseId,
      });

      const items = deadlines.map((d) => formatDeadlineForModel(d, now));
      const count = (u: Urgency) =>
        items.filter((i) => !i.done && i.urgency === u).length;
      return {
        now: formatStudentTime(new Date(now)),
        courseFilter:
          courseCode && !courseId
            ? `No enrolled course "${courseCode}"; showing all courses`
            : (courseCode ?? "All courses"),
        total: items.length,
        overdue: count("overdue"),
        dueWithin24h: count("urgent"),
        dueWithin3Days: count("soon"),
        deadlines: items,
        ...(items.length === 0 && {
          hint: "No deadlines found. Assignments and quizzes the student captures with Askly Capture appear automatically; they can also ask you to add one.",
        }),
      };
    },
  });

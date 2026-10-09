import { tool as createTool } from "ai";
import { and, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "lib/db/pg/schema.pg";
import {
  DeadlineError,
  addPersonalDeadline,
  deletePersonalDeadline,
  setDeadlineDone,
} from "lib/deadlines";
import { STUDENT_TIMEZONE, studentUtcOffset } from "lib/deadlines/time";
import { z } from "zod";
import { formatDeadlineForModel } from "./assignment-tracker.tool";

/**
 * Lets the chat keep the student's deadlines for them: add one they mention,
 * tick one off, or remove one they added. Bound to the signed-in student.
 */
export const createManageDeadlinesTool = (userId: string) =>
  createTool({
    description: `Add, complete or remove the student's deadlines. Use when the student tells you about something due ("my COS102 test is on Friday at 2pm") or says they've finished something. Get keys for complete/reopen/remove from get-upcoming-assignments. Times are the student's local time (${STUDENT_TIMEZONE}); write dueAt as an ISO datetime with offset ${studentUtcOffset()}. If the student gives no time, use 23:59. Confirm back what you saved.`,
    inputSchema: z.object({
      action: z.enum(["add", "complete", "reopen", "remove"]),
      title: z.string().max(200).optional().describe("add: what's due"),
      dueAt: z
        .string()
        .optional()
        .describe(
          `add: ISO datetime with offset, e.g. 2026-10-16T14:00:00${studentUtcOffset()}`,
        ),
      courseCode: z.string().optional().describe("add: the course, if any"),
      notes: z.string().max(2000).optional().describe("add: extra details"),
      key: z
        .string()
        .optional()
        .describe(
          "complete/reopen/remove: the deadline's key, e.g. personal:<id>",
        ),
    }),
    execute: async (input) => {
      try {
        if (input.action === "add") {
          if (!input.title?.trim() || !input.dueAt) {
            return { error: "add needs a title and dueAt" };
          }
          const dueAt = new Date(input.dueAt);
          if (Number.isNaN(dueAt.getTime())) {
            return { error: "dueAt isn't a valid date" };
          }
          let courseId: string | null = null;
          if (input.courseCode) {
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
                  eq(
                    CourseSchema.courseCode,
                    input.courseCode.trim().toUpperCase(),
                  ),
                ),
              )
              .limit(1);
            courseId = course?.id ?? null;
          }
          const deadline = await addPersonalDeadline(userId, {
            title: input.title,
            dueAt,
            courseId,
            notes: input.notes,
          });
          return {
            saved: formatDeadlineForModel(deadline),
            ...(input.courseCode &&
              !courseId && {
                note: `Saved without a course: the student isn't enrolled in ${input.courseCode}.`,
              }),
          };
        }
        if (!input.key) return { error: `${input.action} needs a key` };
        if (input.action === "remove") {
          await deletePersonalDeadline(userId, input.key);
          return { removed: input.key };
        }
        await setDeadlineDone(userId, input.key, input.action === "complete");
        return { updated: input.key, done: input.action === "complete" };
      } catch (error) {
        if (error instanceof DeadlineError) return { error: error.message };
        throw error;
      }
    },
  });

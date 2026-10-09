import { tool as createTool } from "ai";
import { formatStudentTime } from "lib/deadlines/time";
import { describeActivity, getRecentActivity } from "lib/memory/student-memory";
import { z } from "zod";

/**
 * The student's own study history (captures, quiz scores and missed
 * questions, deadlines finished, questions asked, flashcards reviewed).
 * Bound to the signed-in student.
 */
export const createMyActivityTool = (userId: string) =>
  createTool({
    description:
      "Look up what the student did in Askly recently: what they captured, quiz/exam scores and the questions they missed, deadlines they finished, what they asked about, flashcards reviewed. Use for 'what did I study last week', 'how am I doing in X', 'what should I revise', or to pick weak topics for a new quiz.",
    inputSchema: z.object({
      days: z
        .number()
        .int()
        .min(1)
        .max(90)
        .optional()
        .default(7)
        .describe("How many days back (default 7)"),
      courseCode: z
        .string()
        .optional()
        .describe("Only this course (one of the student's course codes)"),
    }),
    execute: async ({ days, courseCode }) => {
      const events = await getRecentActivity(userId, {
        days,
        courseCode,
        limit: 100,
      });
      const count = (type: string) =>
        events.filter((e) => e.type === type).length;
      return {
        period: `last ${days} day${days === 1 ? "" : "s"}`,
        courseFilter: courseCode ?? "all courses",
        totals: {
          captures: count("capture_added"),
          quizzes: count("quiz_completed"),
          flashcardsReviewed: count("flashcard_reviewed"),
          deadlinesFinished: count("deadline_completed"),
          questionsAsked: count("course_question_asked"),
        },
        // Flashcard reviews are summarised in totals; list the rest
        events: events
          .filter((e) => e.type !== "flashcard_reviewed")
          .slice(0, 40)
          .map((e) => ({
            when: formatStudentTime(new Date(e.at)),
            what: describeActivity(e),
          })),
        ...(events.length === 0 && {
          hint: "Nothing recorded in this period. Say so, and offer to help them get started (e.g. capture a lecture, take a quiz).",
        }),
      };
    },
  });

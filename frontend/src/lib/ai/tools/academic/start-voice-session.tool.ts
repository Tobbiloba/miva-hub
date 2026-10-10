import { checkPaidAccess } from "@/lib/billing/access";
import { tool as createTool } from "ai";
import { and, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "lib/db/pg/schema.pg";
import { getVoiceAllowance } from "lib/voice/allowance";
import {
  MIN_START_SECONDS,
  voiceLimitMessage,
} from "lib/voice/allowance-rules";
import { z } from "zod";

/**
 * Sets up a Voice Coach session from chat ("let's practise COS101 week 3 out
 * loud", "give me a mock viva on MTH101"). The chat can't use the microphone
 * itself, so this returns a link that opens the Voice Coach with the course,
 * mode and topic already chosen; the student presses start there. Only
 * courses the signed-in student is enrolled in are accepted.
 */
export const createStartVoiceSessionTool = (userId: string) =>
  createTool({
    description:
      'Set up a spoken Voice Coach session when the student wants to talk something through out loud, practise speaking, or do a mock viva/oral exam. mode "tutor" explains and checks understanding; mode "viva" is an examiner who asks questions and grades them. The student sees a Start button for it automatically: say in one short line what the session will cover, and do not write a link.',
    inputSchema: z.object({
      courseCode: z
        .string()
        .describe("The course code, e.g. COS101 (an enrolled course)"),
      mode: z
        .enum(["tutor", "viva"])
        .default("tutor")
        .describe("tutor (default) or viva for a graded mock viva"),
      focusTopic: z
        .string()
        .max(200)
        .optional()
        .describe("What to focus on, e.g. 'week 3: recursion'"),
    }),
    execute: async ({ courseCode, mode, focusTopic }) => {
      const code = courseCode.trim().toUpperCase();
      const enrolled = await pgDb
        .select({
          id: CourseSchema.id,
          courseCode: CourseSchema.courseCode,
          title: CourseSchema.title,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(
          CourseSchema,
          eq(CourseSchema.id, StudentEnrollmentSchema.courseId),
        )
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.status, "enrolled"),
          ),
        );
      const course = enrolled.find((c) => c.courseCode === code);
      if (!course) {
        return {
          error: `Not enrolled in ${code}`,
          enrolledCourses: enrolled.map((c) => c.courseCode),
        };
      }
      const access = await checkPaidAccess(userId);
      if (!access.allowed) return { error: access.reason };
      const allowance = await getVoiceAllowance(userId, access.via);
      if (allowance.remainingSeconds < MIN_START_SECONDS) {
        return { error: voiceLimitMessage(allowance) };
      }
      const topic = focusTopic?.trim() || null;
      const params = new URLSearchParams({ course: course.id, mode });
      if (topic) params.set("topic", topic);
      return {
        url: `/student/viva?${params}`,
        courseCode: course.courseCode,
        courseTitle: course.title,
        mode,
        focusTopic: topic,
        minutesLeft: Math.floor(allowance.remainingSeconds / 60),
      };
    },
    // The card in chat carries the link; keep it from the model so the reply
    // doesn't repeat it as text
    toModelOutput: (output) => {
      const { url, ...rest } = output as { url?: string };
      return {
        type: "json",
        value: url
          ? { ...rest, shown: "Start button shown to the student" }
          : rest,
      };
    },
  });

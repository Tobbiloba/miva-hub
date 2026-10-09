import { tool as createTool } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { pgDb } from "../../../db/pg/db.pg";
import {
  CourseSchema,
  StudentEnrollmentSchema,
} from "../../../db/pg/schema.pg";
import { searchEnrolledMaterials } from "../../rag/retrieve";

/**
 * Search the text of the signed-in student's course materials (lecture
 * notes, readings, transcripts, their own captures). Bound to the session
 * user; only courses they're enrolled in are searched.
 */
export const createSearchMaterialsTool = (userId: string) =>
  createTool({
    description:
      "Search the actual text of the student's course materials (lecture notes, readings, transcripts, their own captures). Call this for ANY question about what a course teaches or what the notes say, then answer only from the returned passages and cite them as [S1], [S2]. If nothing relevant comes back, say the materials don't cover it — never present general knowledge as coming from the course notes.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .describe("What to look for, in the student's words"),
      courseCode: z
        .string()
        .optional()
        .describe(
          "Optional: limit to one of the student's enrolled course codes (exactly as listed by get-my-courses). Omit when unsure.",
        ),
    }),
    execute: async ({ query, courseCode }) => {
      // The course filter is optional and models often guess it ("CS101"
      // for COS101). An unknown code must not empty the search: search all
      // of the student's courses and say which codes are real.
      const enrolled = await pgDb
        .select({ id: CourseSchema.id, code: CourseSchema.courseCode })
        .from(StudentEnrollmentSchema)
        .innerJoin(
          CourseSchema,
          eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
        )
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.status, "enrolled"),
          ),
        );
      const wanted = courseCode?.trim().toUpperCase();
      const match = wanted
        ? enrolled.find((c) => c.code.toUpperCase() === wanted)
        : undefined;
      const courseId = match?.id;
      const note =
        wanted && !match
          ? `${wanted} isn't one of this student's courses (${enrolled.map((c) => c.code).join(", ")}); searched all of them instead.`
          : undefined;

      const passages = await searchEnrolledMaterials(userId, query, {
        courseId,
      });
      if (passages.length === 0) {
        return {
          passages: [],
          note,
          message:
            "No matching passages in this student's course materials. Say so plainly; do not invent course content.",
        };
      }
      return {
        note,
        passages: passages.map((p, i) => ({
          source: `S${i + 1}`,
          course: p.courseCode,
          title: p.title,
          type: p.materialType,
          week: p.weekNumber,
          ownCapture: p.isOwnCapture,
          text: p.content,
        })),
      };
    },
  });

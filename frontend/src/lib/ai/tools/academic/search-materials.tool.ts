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
        .describe("Limit to one enrolled course, e.g. COS101"),
    }),
    execute: async ({ query, courseCode }) => {
      let courseId: string | undefined;
      if (courseCode) {
        const [course] = await pgDb
          .select({ id: CourseSchema.id })
          .from(StudentEnrollmentSchema)
          .innerJoin(
            CourseSchema,
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
          )
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, userId),
              eq(StudentEnrollmentSchema.status, "enrolled"),
              eq(CourseSchema.courseCode, courseCode.trim().toUpperCase()),
            ),
          )
          .limit(1);
        if (!course) {
          return {
            error: `You're not enrolled in ${courseCode.toUpperCase()}`,
            passages: [],
          };
        }
        courseId = course.id;
      }

      const passages = await searchEnrolledMaterials(userId, query, {
        courseId,
      });
      if (passages.length === 0) {
        return {
          passages: [],
          message:
            "No matching passages in this student's course materials. Say so plainly; do not invent course content.",
        };
      }
      return {
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

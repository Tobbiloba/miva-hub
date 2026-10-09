import { tool as createTool } from "ai";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { pgDb } from "../../../db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  MaterialChunkSchema,
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
        const searched = courseId
          ? enrolled.filter((c) => c.id === courseId)
          : enrolled;
        const withContent = await coursesWithSearchableContent(
          userId,
          searched.map((c) => c.id),
        );
        const empty = searched
          .filter((c) => !withContent.has(c.id))
          .map((c) => c.code);
        return {
          passages: [],
          note,
          coursesWithoutMaterials: empty,
          message:
            empty.length === searched.length
              ? `Askly has no materials yet for ${empty.join(", ") || "the student's courses"}. Tell the student plainly, and that they can add them by opening the lectures/PDFs on their LMS and pressing Capture in the Askly Capture extension. Do not answer as if from their notes.`
              : "No matching passages in this student's course materials. Say so plainly; do not invent course content. If the topic is from a lecture they haven't captured yet, they can capture it with Askly Capture.",
        };
      }
      return {
        note,
        passages: passages.map((p, i) => ({
          source: `S${i + 1}`,
          // lets the chat UI link [S#] citations to the material
          materialId: p.materialId,
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

/**
 * Which of these courses have anything the student's search can hit: chunks
 * of published shared material or of their own captures (same rule as
 * searchEnrolledMaterials).
 */
async function coursesWithSearchableContent(
  studentId: string,
  courseIds: string[],
): Promise<Set<string>> {
  if (courseIds.length === 0) return new Set();
  const rows = await pgDb
    .selectDistinct({ courseId: MaterialChunkSchema.courseId })
    .from(MaterialChunkSchema)
    .innerJoin(
      CourseMaterialSchema,
      eq(CourseMaterialSchema.id, MaterialChunkSchema.materialId),
    )
    .where(
      and(
        inArray(MaterialChunkSchema.courseId, courseIds),
        isNull(CourseMaterialSchema.deletedAt),
        or(
          and(
            isNull(MaterialChunkSchema.ownerUserId),
            isNull(CourseMaterialSchema.ownerUserId),
            eq(CourseMaterialSchema.isPublished, true),
          ),
          and(
            eq(MaterialChunkSchema.ownerUserId, studentId),
            eq(CourseMaterialSchema.ownerUserId, studentId),
          ),
        ),
      ),
    );
  return new Set(rows.map((r) => r.courseId));
}

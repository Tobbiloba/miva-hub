import { tool as createTool } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { safe } from "ts-safe";
import { z } from "zod";
import { pgDb } from "../../../db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  StudentEnrollmentSchema,
} from "../../../db/pg/schema.pg";
import { groundableMaterialFilter } from "../../course-tutor-context";

/**
 * Course Content Tool - Fetches course materials with enrollment verification
 * Supports filtering by week number and material type
 */

const courseContentSchema = z.object({
  courseCode: z.string().describe("Course code like CS101, MATH201"),
  weekNumber: z.number().optional().describe("Specific week number (1-16)"),
  materialType: z
    .enum(["all", "lecture", "reading", "assignment", "lab", "exam"])
    .optional()
    .default("all")
    .describe("Type of material to fetch"),
});

/**
 * Bound to the signed-in student: the user id comes from the session, never
 * from model input (a prompt-injected id would read another student's data).
 */
export const createCourseContentTool = (userId: string) =>
  createTool({
    description:
      "List the materials (titles, weeks, types) of one enrolled course. Use it to show what exists. To explain a topic, quiz the student or answer what the notes say, use search-course-materials instead — this tool returns titles, not the text. Don't guess a week number; omit it unless the student named one.",
    inputSchema: courseContentSchema,
    execute: async ({ courseCode, weekNumber, materialType }) => {
      return safe(async () => {
        // Resolve the course through the student's own enrollments: course
        // codes are only unique per university, and this doubles as the
        // access check.
        const code = courseCode.trim().toUpperCase();
        const [enrolled] = await pgDb
          .select({ course: CourseSchema, enrollment: StudentEnrollmentSchema })
          .from(StudentEnrollmentSchema)
          .innerJoin(
            CourseSchema,
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
          )
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, userId),
              eq(StudentEnrollmentSchema.status, "enrolled"),
              eq(CourseSchema.courseCode, code),
            ),
          )
          .limit(1);

        if (!enrolled) {
          return {
            error: `You are not enrolled in ${code}`,
            message:
              "You can only access materials for courses you're enrolled in. Use get-my-courses to see your courses.",
          };
        }
        const { course, enrollment } = enrolled;

        // Published shared material plus the student's own private captures
        // — never a classmate's private capture, unmoderated or deleted rows.
        let materials = await pgDb
          .select()
          .from(CourseMaterialSchema)
          .where(
            and(
              eq(CourseMaterialSchema.courseId, course.id),
              groundableMaterialFilter(userId),
            ),
          )
          .orderBy(
            asc(CourseMaterialSchema.weekNumber),
            asc(CourseMaterialSchema.createdAt),
          );

        const availableWeeks = [
          ...new Set(
            materials
              .map((m) => m.weekNumber)
              .filter((w): w is number => w != null),
          ),
        ].sort((a, b) => a - b);

        // Apply week filter if specified
        if (weekNumber) {
          materials = materials.filter((m) => m.weekNumber === weekNumber);
        }

        // Apply material type filter if not "all"
        if (materialType !== "all") {
          materials = materials.filter((m) => m.materialType === materialType);
        }

        // Format materials for response
        const formattedMaterials = materials.map((material) => ({
          id: material.id,
          week: material.weekNumber,
          title: material.title,
          type: material.materialType,
          description: material.description,
          fileName: material.fileName,
          fileSize: material.fileSize,
          mimeType: material.mimeType,
          moduleNumber: material.moduleNumber,
          isMine: material.ownerUserId === userId,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
        }));

        // Generate summary
        const summary = generateMaterialsSummary(
          formattedMaterials,
          courseCode,
          weekNumber,
          materialType,
        );

        return {
          course: {
            code: course.courseCode,
            title: course.title,
            credits: course.credits,
            level: course.level,
            semesterOffered: course.semesterOffered,
            isActive: course.isActive,
          },
          filters: {
            week: weekNumber || "all weeks",
            materialType,
            totalMaterials: formattedMaterials.length,
          },
          materials: formattedMaterials,
          availableWeeks,
          summary,
          enrollment: {
            status: enrollment.status,
            enrolledDate: enrollment.enrollmentDate,
            semester: enrollment.semester,
          },
        };
      })
        .ifFail((error) => {
          console.error("Course content tool error:", error);
          return {
            isError: true,
            error: error.message,
            solution:
              "There was a problem accessing course materials. Please try again or contact IT support if the issue persists.",
          };
        })
        .unwrap();
    },
  });

/**
 * Generate a human-readable summary of the materials found
 */
function generateMaterialsSummary(
  materials: any[],
  courseCode: string,
  weekNumber?: number,
  materialType?: string,
): string {
  if (materials.length === 0) {
    const weekText = weekNumber ? ` for week ${weekNumber}` : "";
    const typeText =
      materialType && materialType !== "all"
        ? ` of type '${materialType}'`
        : "";
    return `No materials found${weekText}${typeText} for ${courseCode}`;
  }

  // Group by material type for detailed summary
  const byType = materials.reduce(
    (acc, material) => {
      const type = material.type || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const weekText = weekNumber ? ` for week ${weekNumber}` : "";
  const typesSummary = Object.entries(byType)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
    .join(", ");

  return `Found ${materials.length} material${materials.length !== 1 ? "s" : ""}${weekText} in ${courseCode}: ${typesSummary}`;
}

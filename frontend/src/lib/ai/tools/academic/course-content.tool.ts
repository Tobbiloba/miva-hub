import { tool as createTool } from "ai";
import { z } from "zod";
import { pgAcademicRepository } from "../../../db/pg/repositories/academic-repository.pg";
import { pgDb } from "../../../db/pg/db.pg";
import { StudentEnrollmentSchema } from "../../../db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { safe } from "ts-safe";

/**
 * Course Content Tool - Fetches course materials with enrollment verification
 * Supports filtering by week number and material type
 */

const courseContentSchema = z.object({
  courseCode: z.string().describe("Course code like CS101, MATH201"),
  weekNumber: z.number().optional().describe("Specific week number (1-16)"),
  materialType: z.enum(["all", "lecture", "reading", "assignment", "lab", "exam"]).optional().default("all").describe("Type of material to fetch"),
  userId: z.string().describe("Student user ID to verify enrollment")
});

export const courseContentTool = createTool({
  description: "Fetch course materials for specific week, topic, or material type. Only accessible for enrolled courses.",
  inputSchema: courseContentSchema,
  execute: async ({ courseCode, weekNumber, materialType, userId }) => {
    return safe(async () => {
      // First, get the course by code
      const course = await pgAcademicRepository.getCourseByCode(courseCode.toUpperCase());
      
      if (!course) {
        return {
          error: `Course ${courseCode} not found`,
          suggestions: [
            "Check the course code spelling (e.g., CS101, MATH201)",
            "Make sure the course exists this semester",
            "Try searching available courses first"
          ]
        };
      }

      // Verify the user is enrolled in this course
      const enrollment = await pgDb
        .select()
        .from(StudentEnrollmentSchema)
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.courseId, course.id),
            eq(StudentEnrollmentSchema.status, 'enrolled')
          )
        )
        .limit(1);

      if (enrollment.length === 0) {
        return {
          error: `You are not enrolled in ${courseCode}`,
          message: "You can only access materials for courses you're enrolled in",
          courseInfo: {
            code: course.courseCode,
            title: course.title,
            credits: course.credits,
            department: course.description
          },
          suggestions: [
            "Contact your advisor to enroll in this course",
            "Check your enrolled courses list",
            "Visit the registrar's office for enrollment assistance"
          ]
        };
      }

      // Get course materials with optional filters
      let materials = await pgAcademicRepository.getCourseMaterials(course.id);

      // Apply week filter if specified
      if (weekNumber) {
        materials = materials.filter(m => m.weekNumber === weekNumber);
      }

      // Apply material type filter if not "all"
      if (materialType !== "all") {
        materials = materials.filter(m => m.materialType === materialType);
      }

      // Format materials for response
      const formattedMaterials = materials.map(material => ({
        id: material.id,
        week: material.weekNumber,
        title: material.title,
        type: material.materialType,
        description: material.description,
        contentUrl: material.contentUrl,
        fileName: material.fileName,
        fileSize: material.fileSize,
        mimeType: material.mimeType,
        moduleNumber: material.moduleNumber,
        isPublic: material.isPublic,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt
      }));

      // Generate summary
      const summary = generateMaterialsSummary(formattedMaterials, courseCode, weekNumber, materialType);

      return {
        course: {
          code: course.courseCode,
          title: course.title,
          credits: course.credits,
          level: course.level,
          semesterOffered: course.semesterOffered,
          isActive: course.isActive
        },
        filters: {
          week: weekNumber || "all weeks",
          materialType,
          totalMaterials: formattedMaterials.length
        },
        materials: formattedMaterials,
        summary,
        enrollment: {
          status: enrollment[0].status,
          enrolledDate: enrollment[0].enrollmentDate,
          semester: enrollment[0].semester
        }
      };

    }).ifFail((error) => {
      console.error("Course content tool error:", error);
      return {
        isError: true,
        error: error.message,
        solution: "There was a problem accessing course materials. Please try again or contact IT support if the issue persists."
      };
    }).unwrap();
  }
});

/**
 * Generate a human-readable summary of the materials found
 */
function generateMaterialsSummary(
  materials: any[], 
  courseCode: string, 
  weekNumber?: number, 
  materialType?: string
): string {
  if (materials.length === 0) {
    const weekText = weekNumber ? ` for week ${weekNumber}` : '';
    const typeText = materialType && materialType !== 'all' ? ` of type '${materialType}'` : '';
    return `No materials found${weekText}${typeText} for ${courseCode}`;
  }

  // Group by material type for detailed summary
  const byType = materials.reduce((acc, material) => {
    const type = material.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weekText = weekNumber ? ` for week ${weekNumber}` : '';
  const typesSummary = Object.entries(byType)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
    .join(', ');

  return `Found ${materials.length} material${materials.length !== 1 ? 's' : ''}${weekText} in ${courseCode}: ${typesSummary}`;
}
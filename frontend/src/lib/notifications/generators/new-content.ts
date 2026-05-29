import { pgDb } from "@/lib/db/pg/db.pg";
import {
  StudentEnrollmentSchema,
  CourseMaterialSchema,
  CourseSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { existsEverForStudent, createNotification } from "./helpers";

/**
 * Generate new_content notifications for a specific material that was just published.
 * Called directly from the admin approval endpoint — NOT polled.
 */
export async function generateNewContentNotification(
  materialId: string,
): Promise<number> {
  // Get the material details
  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      courseId: CourseMaterialSchema.courseId,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      weekNumber: CourseMaterialSchema.weekNumber,
      courseCode: CourseSchema.courseCode,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(eq(CourseMaterialSchema.id, materialId))
    .limit(1);

  if (!material) return 0;

  // Find all enrolled students for this course
  const enrollments = await pgDb
    .select({ studentId: StudentEnrollmentSchema.studentId })
    .from(StudentEnrollmentSchema)
    .where(
      and(
        eq(StudentEnrollmentSchema.courseId, material.courseId),
        eq(StudentEnrollmentSchema.status, "enrolled"),
      ),
    );

  let created = 0;

  for (const { studentId } of enrollments) {
    // One-shot dedup: never re-notify about the same material
    if (await existsEverForStudent(studentId, "new_content", materialId))
      continue;

    await createNotification({
      studentId,
      type: "new_content",
      title: `New material in ${material.courseCode}`,
      body: `'${material.title}' was just added.`,
      entityUrl: `/student/materials`,
      entityId: materialId,
      entityMetadata: {
        courseCode: material.courseCode,
        materialType: material.materialType,
        weekNumber: material.weekNumber,
      },
    });
    created++;
  }

  return created;
}

import "server-only";

import { and, eq } from "drizzle-orm";

import { pgDb } from "lib/db/pg/db.pg";
import {
  AIProcessedContentSchema,
  CourseInstructorSchema,
  CourseMaterialSchema,
  CourseSchema,
  FacultySchema,
  StudentEnrollmentSchema,
} from "lib/db/pg/schema.pg";

/**
 * Is this user assigned to teach this course (any semester)? Deliberately NOT
 * semester-filtered: checkCourseInstructorAccess compares getCurrentSemester()
 * ("2026-summer") against course_instructor.semester rows ("2025/2026-first"),
 * a format mismatch that always fails. Assignment itself is the access signal.
 */
export async function isCourseInstructor(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const [row] = await pgDb
    .select({ id: CourseInstructorSchema.id })
    .from(CourseInstructorSchema)
    .innerJoin(
      FacultySchema,
      eq(CourseInstructorSchema.facultyId, FacultySchema.id),
    )
    .where(
      and(
        eq(FacultySchema.userId, userId),
        eq(CourseInstructorSchema.courseId, courseId),
      ),
    )
    .limit(1);
  return !!row;
}

export interface LectureStudyRecord {
  material: {
    id: string;
    title: string;
    description: string | null;
    weekNumber: number | null;
    courseId: string;
    courseCode: string;
    courseTitle: string;
    uploadedById: string;
    transcriptStatus: string | null;
  };
  kit: {
    summary: string | null;
    keyConcepts: string[];
    difficulty: string | null;
    estimatedReadTime: number | null;
    processingMetadata: Record<string, any>;
  } | null;
}

/**
 * Load a lecture material + its AI study kit, enforcing access: the uploader,
 * a course instructor, or a student enrolled in the course. Access is derived
 * from the session user id — never from the request.
 */
export async function loadLectureStudy(
  materialId: string,
  userId: string,
): Promise<
  | { allowed: true; record: LectureStudyRecord }
  | { allowed: false; status: 403 | 404 }
> {
  const [row] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      description: CourseMaterialSchema.description,
      weekNumber: CourseMaterialSchema.weekNumber,
      courseId: CourseMaterialSchema.courseId,
      uploadedById: CourseMaterialSchema.uploadedById,
      transcriptStatus: CourseMaterialSchema.transcriptStatus,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(eq(CourseMaterialSchema.id, materialId))
    .limit(1);

  if (!row) return { allowed: false, status: 404 };

  let allowed = row.uploadedById === userId;
  if (!allowed) {
    const [enrollment] = await pgDb
      .select({ id: StudentEnrollmentSchema.id })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, userId),
          eq(StudentEnrollmentSchema.courseId, row.courseId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      )
      .limit(1);
    allowed = !!enrollment;
  }
  if (!allowed) {
    allowed = await isCourseInstructor(userId, row.courseId);
  }
  if (!allowed) return { allowed: false, status: 403 };

  const [processed] = await pgDb
    .select({
      aiSummary: AIProcessedContentSchema.aiSummary,
      keyConcepts: AIProcessedContentSchema.keyConcepts,
      difficulty: AIProcessedContentSchema.difficulty,
      estimatedReadTime: AIProcessedContentSchema.estimatedReadTime,
      processingMetadata: AIProcessedContentSchema.processingMetadata,
    })
    .from(AIProcessedContentSchema)
    .where(eq(AIProcessedContentSchema.courseMaterialId, materialId))
    .limit(1);

  return {
    allowed: true,
    record: {
      material: {
        id: row.id,
        title: row.title,
        description: row.description,
        weekNumber: row.weekNumber,
        courseId: row.courseId,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        uploadedById: row.uploadedById,
        transcriptStatus: row.transcriptStatus,
      },
      kit: processed
        ? {
            summary: processed.aiSummary,
            keyConcepts: (processed.keyConcepts as string[]) ?? [],
            difficulty: processed.difficulty,
            estimatedReadTime: processed.estimatedReadTime,
            processingMetadata:
              (processed.processingMetadata as Record<string, any>) ?? {},
          }
        : null,
    },
  };
}

import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  StudentEnrollmentSchema,
} from "lib/db/pg/schema.pg";

/**
 * Whole-course-context builder for the Gemini tutor.
 *
 * Instead of RAG retrieval, we exploit Gemini's long context window: every
 * published material for the course is packed into one numbered source list
 * [S1]..[Sn] so the model can cite exactly where an answer came from.
 */

export interface TutorSource {
  /** 1-based index — the model cites sources as [S1], [S2], ... */
  index: number;
  materialId: string;
  title: string;
  materialType: string;
  weekNumber: number | null;
  /** Whether full text (transcript) was available, vs. only a description */
  hasFullText: boolean;
}

export interface CourseTutorContext {
  course: {
    id: string;
    universityId: string;
    courseCode: string;
    title: string;
    description: string | null;
  };
  sources: TutorSource[];
  /** The assembled context block injected into the system prompt */
  contextText: string;
  totalCharacters: number;
}

// ~200k chars ≈ 50k tokens — well inside gemini-2.5-flash's 1M window while
// leaving room for history + answer, and keeping free-tier TPM viable.
const MAX_CONTEXT_CHARS = 200_000;
const MAX_CHARS_PER_SOURCE = 40_000;

/**
 * Verify the student is actively enrolled in the course (tenant + access
 * check in one query). Returns null when not enrolled.
 */
export async function getEnrolledCourse(studentId: string, courseId: string) {
  const [row] = await pgDb
    .select({
      id: CourseSchema.id,
      universityId: CourseSchema.universityId,
      courseCode: CourseSchema.courseCode,
      title: CourseSchema.title,
      description: CourseSchema.description,
    })
    .from(StudentEnrollmentSchema)
    .innerJoin(
      CourseSchema,
      eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
    )
    .where(
      and(
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.courseId, courseId),
        eq(StudentEnrollmentSchema.status, "enrolled"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Build the whole-course context for an enrolled student.
 * Returns null when the student is not enrolled in the course.
 */
export async function buildCourseTutorContext(
  studentId: string,
  courseId: string,
): Promise<CourseTutorContext | null> {
  const course = await getEnrolledCourse(studentId, courseId);
  if (!course) return null;

  const materials = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      description: CourseMaterialSchema.description,
      weekNumber: CourseMaterialSchema.weekNumber,
      transcriptText: CourseMaterialSchema.transcriptText,
    })
    .from(CourseMaterialSchema)
    .where(
      and(
        eq(CourseMaterialSchema.courseId, courseId),
        eq(CourseMaterialSchema.isPublished, true),
        isNull(CourseMaterialSchema.deletedAt),
      ),
    )
    .orderBy(
      asc(CourseMaterialSchema.weekNumber),
      asc(CourseMaterialSchema.createdAt),
    );

  const sources: TutorSource[] = [];
  const blocks: string[] = [];
  let used = 0;

  for (const material of materials) {
    const fullText = material.transcriptText?.trim();
    const body = (fullText || material.description?.trim() || "").slice(
      0,
      MAX_CHARS_PER_SOURCE,
    );
    if (!body) continue;

    const index = sources.length + 1;
    const header = [
      `[S${index}] "${material.title}"`,
      `type: ${material.materialType}`,
      material.weekNumber != null ? `week ${material.weekNumber}` : null,
      fullText ? "full text" : "description only",
    ]
      .filter(Boolean)
      .join(" | ");

    const block = `${header}\n${body}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;

    sources.push({
      index,
      materialId: material.id,
      title: material.title,
      materialType: material.materialType,
      weekNumber: material.weekNumber,
      hasFullText: !!fullText,
    });
    blocks.push(block);
    used += block.length;
  }

  const contextText = [
    `COURSE: ${course.courseCode} — ${course.title}`,
    course.description ? `DESCRIPTION: ${course.description}` : null,
    "",
    `COURSE MATERIALS (${sources.length} sources):`,
    blocks.join("\n\n---\n\n"),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    course,
    sources,
    contextText,
    totalCharacters: used,
  };
}

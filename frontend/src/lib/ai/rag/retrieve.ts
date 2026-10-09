import "server-only";

import { sql } from "drizzle-orm";
import {
  type CourseTutorContext,
  type TutorSource,
  getEnrolledCourse,
  neutralizeMaterialText,
} from "lib/ai/course-tutor-context";
import { pgDb } from "lib/db/pg/db.pg";
import { embedQuery, toVectorLiteral } from "./embedding";

// Retrieved chunks are far smaller than a whole course, so a tighter budget
// keeps the grounding sharp and cheap.
const MAX_CONTEXT_CHARS = 60_000;

interface ChunkRow {
  material_id: string;
  title: string | null;
  material_type: string | null;
  week_number: number | null;
  content: string;
  owner_user_id: string | null;
  score: number;
}

/**
 * Semantic retrieval for course-grounded chat: embed the query, vector-search
 * the course's chunks the student may see (enrollment-gated; shared published
 * material + the student's own private captures; never deleted material — the
 * join re-checks the material's live state), and assemble a numbered [S1]..[Sn]
 * context block matching the shape the chat grounding already consumes.
 * Returns null when the student isn't enrolled or the course has no indexed
 * chunks (caller falls back to whole-course context).
 */
export async function retrieveCourseContext(
  studentId: string,
  courseId: string,
  query: string,
  k = 12,
): Promise<CourseTutorContext | null> {
  const course = await getEnrolledCourse(studentId, courseId);
  if (!course) return null;

  const queryText = query.trim();
  if (!queryText) return null;

  const qvec = toVectorLiteral(await embedQuery(queryText));

  const result = await pgDb.execute(
    sql`SELECT c.material_id, c.title, c.material_type, c.week_number,
               c.content, c.owner_user_id,
               1 - (c.embedding <=> ${qvec}::vector) AS score
        FROM material_chunk c
        JOIN course_material m ON m.id = c.material_id
        WHERE c.course_id = ${courseId}
          AND m.deleted_at IS NULL
          AND (
            (c.owner_user_id IS NULL AND m.owner_user_id IS NULL AND m.is_published)
            OR (c.owner_user_id = ${studentId} AND m.owner_user_id = ${studentId})
          )
        ORDER BY c.embedding <=> ${qvec}::vector
        LIMIT ${k}`,
  );

  const rows = ((result as any).rows ?? result) as ChunkRow[];
  if (!rows || rows.length === 0) return null;

  const sources: TutorSource[] = [];
  const blocks: string[] = [];
  let used = 0;

  for (const row of rows) {
    const index = sources.length + 1;
    const header = [
      `[S${index}] "${row.title ?? "Course material"}"`,
      row.material_type ? `type: ${row.material_type}` : null,
      row.week_number != null ? `week ${row.week_number}` : null,
      row.owner_user_id ? "your own capture" : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const block = `${header}\n${neutralizeMaterialText(row.content)}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;

    sources.push({
      index,
      materialId: row.material_id,
      title: row.title ?? "Course material",
      materialType: row.material_type ?? "unknown",
      weekNumber: row.week_number,
      hasFullText: true,
      isPrivate: !!row.owner_user_id,
    });
    blocks.push(block);
    used += block.length;
  }

  if (sources.length === 0) return null;

  const contextText = [
    `COURSE: ${course.courseCode} — ${course.title}`,
    course.description ? `DESCRIPTION: ${course.description}` : null,
    "",
    `RETRIEVED COURSE MATERIALS (${sources.length} most relevant passages):`,
    blocks.join("\n\n---\n\n"),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { course, sources, contextText, totalCharacters: used };
}

export interface MaterialPassage {
  courseCode: string;
  materialId: string;
  title: string;
  materialType: string | null;
  weekNumber: number | null;
  isOwnCapture: boolean;
  content: string;
}

/**
 * Semantic search across every course the student is actively enrolled in
 * (or one of them, by id) — same visibility rule as retrieveCourseContext:
 * published shared material or the student's own captures, never deleted.
 * Used by the chat's search tool so content questions are answerable without
 * first picking a course.
 */
export async function searchEnrolledMaterials(
  studentId: string,
  query: string,
  opts: { courseId?: string; k?: number; maxCharsPerPassage?: number } = {},
): Promise<MaterialPassage[]> {
  const queryText = query.trim();
  if (!queryText) return [];
  const k = opts.k ?? 8;
  const maxChars = opts.maxCharsPerPassage ?? 1500;

  const qvec = toVectorLiteral(await embedQuery(queryText));
  const result = await pgDb.execute(
    sql`SELECT c.material_id, c.title, c.material_type, c.week_number,
               c.content, c.owner_user_id, co.course_code
        FROM material_chunk c
        JOIN course_material m ON m.id = c.material_id
        JOIN course co ON co.id = c.course_id
        WHERE m.deleted_at IS NULL
          -- EXISTS, not a join: a carryover can leave two "enrolled" rows for
          -- one course, which a join would turn into duplicate passages
          AND EXISTS (
            SELECT 1 FROM student_enrollment se
            WHERE se.course_id = c.course_id
              AND se.student_id = ${studentId}
              AND se.status = 'enrolled'
          )
          AND (${opts.courseId ?? null}::uuid IS NULL OR c.course_id = ${opts.courseId ?? null}::uuid)
          AND (
            (c.owner_user_id IS NULL AND m.owner_user_id IS NULL AND m.is_published)
            OR (c.owner_user_id = ${studentId} AND m.owner_user_id = ${studentId})
          )
        ORDER BY c.embedding <=> ${qvec}::vector
        LIMIT ${k}`,
  );
  const rows = ((result as any).rows ?? result) as (ChunkRow & {
    course_code: string;
  })[];
  return rows.map((row) => ({
    courseCode: row.course_code,
    materialId: row.material_id,
    title: row.title ?? "Course material",
    materialType: row.material_type,
    weekNumber: row.week_number,
    isOwnCapture: !!row.owner_user_id,
    content: neutralizeMaterialText(row.content).slice(0, maxChars),
  }));
}

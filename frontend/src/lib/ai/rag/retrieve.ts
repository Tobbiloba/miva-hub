import "server-only";

import { sql } from "drizzle-orm";
import {
  type CourseTutorContext,
  type TutorSource,
  getEnrolledCourse,
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
  score: number;
}

/**
 * Semantic retrieval for course-grounded chat: embed the query, vector-search
 * the course's chunks (enrollment-gated), and assemble a numbered [S1]..[Sn]
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
    sql`SELECT material_id, title, material_type, week_number, content,
               1 - (embedding <=> ${qvec}::vector) AS score
        FROM material_chunk
        WHERE course_id = ${courseId}
        ORDER BY embedding <=> ${qvec}::vector
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
    ]
      .filter(Boolean)
      .join(" | ");

    const block = `${header}\n${row.content}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;

    sources.push({
      index,
      materialId: row.material_id,
      title: row.title ?? "Course material",
      materialType: row.material_type ?? "unknown",
      weekNumber: row.week_number,
      hasFullText: true,
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

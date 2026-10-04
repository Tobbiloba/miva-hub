/**
 * Backfill / retry RAG embeddings into material_chunk.
 *
 * Indexes every material that may ground chat (published shared material and
 * students' private captures) whose rag_index_status is not yet "indexed" —
 * i.e. never indexed, or a previous attempt failed. Uses the same indexer as
 * the app, so ownership and status are recorded identically.
 *
 * Run pending/failed:  npx tsx --conditions=react-server scripts/backfill-embeddings.ts
 * One course:          ... scripts/backfill-embeddings.ts COS203
 * Re-index everything: ... scripts/backfill-embeddings.ts --all
 * Remote database:     add --allow-remote (deliberate; e.g. after applying
 *                      the material_chunk migration to production)
 */
import "load-env";

import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { indexCourseMaterial } from "lib/ai/rag/index-material";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseMaterialSchema, CourseSchema } from "lib/db/pg/schema.pg";

const args = process.argv.slice(2);
const reindexAll = args.includes("--all");
const allowRemote = args.includes("--allow-remote");
const courseFilter = args.find((a) => !a.startsWith("--"))?.trim();

const dbUrl = process.env.POSTGRES_URL ?? "";
if (!allowRemote && !/localhost|127\.0\.0\.1/.test(dbUrl)) {
  console.error(
    `Refusing to run: POSTGRES_URL is not local (${dbUrl.replace(/:[^:@/]+@/, ":***@")}). Pass --allow-remote to index a remote database deliberately.`,
  );
  process.exit(1);
}

async function main() {
  const rows = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      courseCode: CourseSchema.courseCode,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(
      and(
        isNull(CourseMaterialSchema.deletedAt),
        or(
          eq(CourseMaterialSchema.isPublished, true),
          isNotNull(CourseMaterialSchema.ownerUserId),
        ),
        reindexAll
          ? undefined
          : or(
              isNull(CourseMaterialSchema.ragIndexStatus),
              inArray(CourseMaterialSchema.ragIndexStatus, [
                "pending",
                "failed",
              ]),
            ),
        courseFilter ? eq(CourseSchema.courseCode, courseFilter) : undefined,
      ),
    );

  console.log(
    `Indexing ${rows.length} material(s)${courseFilter ? ` for ${courseFilter}` : ""}...`,
  );

  let totalChunks = 0;
  let failed = 0;
  for (const m of rows) {
    try {
      const chunks = await indexCourseMaterial(m.id);
      totalChunks += chunks;
      console.log(`  ✓ "${m.title}" (${m.courseCode}) — ${chunks} chunks`);
    } catch (error) {
      failed++;
      console.error(`  ✗ "${m.title}" (${m.courseCode}) —`, error);
    }
  }

  console.log(
    `Done. ${rows.length - failed} indexed, ${failed} failed, ${totalChunks} chunks total.`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

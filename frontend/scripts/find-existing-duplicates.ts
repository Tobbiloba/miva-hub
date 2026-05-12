/**
 * Find existing duplicate course materials.
 *
 * Checks for course_material rows matching the dedup rule:
 * same course_id + week_number + session_id AND either same vimeo_video_id,
 * same file_name (PDFs), or same title (case-insensitive).
 *
 * Reports only — does not delete anything.
 * Usage: cd frontend && pnpm tsx scripts/find-existing-duplicates.ts
 */

import "load-env";
import { pgDb } from "@/lib/db/pg/db.pg";
import { sql } from "drizzle-orm";

interface DupGroup {
  key: string;
  matchType: string;
  count: number;
  ids: string[];
  titles: string[];
}

async function main() {
  console.log("=== Duplicate Detection Report ===\n");

  const groups: DupGroup[] = [];

  // 1. Video duplicates: same course + week + session + vimeo_video_id
  const videoDups = await pgDb.execute<{
    course_id: string;
    week_number: number | null;
    session_id: string | null;
    vimeo_video_id: string;
    cnt: string;
    ids: string;
    titles: string;
  }>(sql`
    SELECT course_id, week_number, session_id, vimeo_video_id,
           COUNT(*) AS cnt,
           array_agg(id)::text AS ids,
           array_agg(title)::text AS titles
    FROM course_material
    WHERE vimeo_video_id IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY course_id, week_number, session_id, vimeo_video_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  for (const row of videoDups.rows) {
    groups.push({
      key: `vimeo:${row.vimeo_video_id} course:${row.course_id} week:${row.week_number}`,
      matchType: "vimeo_video_id",
      count: parseInt(row.cnt),
      ids: row.ids.replace(/[{}]/g, "").split(","),
      titles: row.titles.replace(/[{}]/g, "").split(","),
    });
  }

  // 2. PDF duplicates: same course + week + session + lower(file_name)
  const pdfDups = await pgDb.execute<{
    course_id: string;
    week_number: number | null;
    session_id: string | null;
    fname: string;
    cnt: string;
    ids: string;
    titles: string;
  }>(sql`
    SELECT course_id, week_number, session_id, lower(file_name) AS fname,
           COUNT(*) AS cnt,
           array_agg(id)::text AS ids,
           array_agg(title)::text AS titles
    FROM course_material
    WHERE mime_type = 'application/pdf'
      AND file_name IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY course_id, week_number, session_id, lower(file_name)
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  for (const row of pdfDups.rows) {
    groups.push({
      key: `pdf:${row.fname} course:${row.course_id} week:${row.week_number}`,
      matchType: "pdf_filename",
      count: parseInt(row.cnt),
      ids: row.ids.replace(/[{}]/g, "").split(","),
      titles: row.titles.replace(/[{}]/g, "").split(","),
    });
  }

  // 3. Title duplicates: same course + week + session + lower(trim(title))
  const titleDups = await pgDb.execute<{
    course_id: string;
    week_number: number | null;
    session_id: string | null;
    norm_title: string;
    cnt: string;
    ids: string;
    titles: string;
  }>(sql`
    SELECT course_id, week_number, session_id, lower(trim(title)) AS norm_title,
           COUNT(*) AS cnt,
           array_agg(id)::text AS ids,
           array_agg(title)::text AS titles
    FROM course_material
    WHERE deleted_at IS NULL
    GROUP BY course_id, week_number, session_id, lower(trim(title))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  for (const row of titleDups.rows) {
    // Skip if already caught by vimeo or pdf match
    const alreadyCaught = groups.some((g) =>
      g.ids.some((id) => row.ids.includes(id))
    );
    if (!alreadyCaught) {
      groups.push({
        key: `title:"${row.norm_title}" course:${row.course_id} week:${row.week_number}`,
        matchType: "title",
        count: parseInt(row.cnt),
        ids: row.ids.replace(/[{}]/g, "").split(","),
        titles: row.titles.replace(/[{}]/g, "").split(","),
      });
    }
  }

  // Report
  if (groups.length === 0) {
    console.log("No duplicates found. Database is clean.");
  } else {
    console.log(`Found ${groups.length} duplicate group(s):\n`);
    for (const g of groups) {
      console.log(`[${g.matchType}] ${g.count}x — ${g.key}`);
      for (let i = 0; i < g.ids.length; i++) {
        console.log(`  ${g.ids[i].trim()} — "${g.titles[i]?.trim()}"`);
      }
      console.log();
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

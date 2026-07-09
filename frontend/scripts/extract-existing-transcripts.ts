/**
 * Backfill script: extract transcripts for existing course materials.
 *
 * Finds all course_material rows where transcript_status is 'pending' or NULL
 * and runs the extraction logic (PDF text via pdfjs-dist, Vimeo VTT).
 *
 * Usage: pnpm tsx scripts/extract-existing-transcripts.ts
 * Idempotent — safe to re-run. Does NOT auto-run.
 */

import "load-env";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema } from "@/lib/db/pg/schema.pg";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";
import { eq, isNull, or } from "drizzle-orm";

async function main() {
  console.log("=== Transcript Backfill Script ===\n");

  // Find all materials needing extraction
  const materials = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      mimeType: CourseMaterialSchema.mimeType,
      contentUrl: CourseMaterialSchema.contentUrl,
      publicUrl: CourseMaterialSchema.publicUrl,
      description: CourseMaterialSchema.description,
    })
    .from(CourseMaterialSchema)
    .where(
      or(
        eq(CourseMaterialSchema.transcriptStatus, "pending"),
        isNull(CourseMaterialSchema.transcriptStatus),
      ),
    )
    .orderBy(CourseMaterialSchema.createdAt);

  const total = materials.length;
  console.log(`Found ${total} materials needing transcript extraction.\n`);

  if (total === 0) {
    console.log("Nothing to do. Exiting.");
    process.exit(0);
  }

  let extracted = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const progress = `[${i + 1}/${total}]`;

    console.log(
      `${progress} Processing: "${mat.title}" (${mat.mimeType || "unknown type"})`,
    );

    // Parse Vimeo info from description if it's a video stub
    let vimeoVideoId: string | undefined;
    let vimeoHash: string | undefined;
    if (mat.mimeType?.startsWith("video/") && mat.description) {
      const vimeoMatch = mat.description.match(
        /Vimeo:.*?\/video\/(\d+)(?:\?h=([a-f0-9]+))?/,
      );
      if (vimeoMatch) {
        vimeoVideoId = vimeoMatch[1];
        vimeoHash = vimeoMatch[2];
      }
    }

    try {
      const result = await extractTranscriptForMaterial(mat.id, mat.mimeType, {
        s3Key: mat.contentUrl ?? undefined,
        vimeoVideoId,
        vimeoHash,
      });

      switch (result.status) {
        case "extracted":
          extracted++;
          console.log(`  -> Extracted (${result.wordCount} words)`);
          break;
        case "skipped":
          skipped++;
          console.log(`  -> Skipped: ${result.error}`);
          break;
        case "failed":
          failed++;
          console.log(`  -> Failed: ${result.error}`);
          break;
      }
    } catch (error: any) {
      failed++;
      console.error(`  -> Error: ${error.message}`);
    }
  }

  console.log(`\n=== Backfill Complete ===`);
  console.log(`Total:     ${total}`);
  console.log(`Extracted: ${extracted}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

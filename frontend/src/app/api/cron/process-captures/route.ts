import { timingSafeEqual } from "node:crypto";
import { indexCourseMaterial } from "@/lib/ai/rag/index-material";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema } from "@/lib/db/pg/schema.pg";
import { claimQueuedJobs, processIngestionJob } from "@/lib/ingest/process-job";
import { and, eq, isNull } from "drizzle-orm";
import logger from "logger";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

/**
 * GET /api/cron/process-captures — the safety net for captures: processes
 * queued jobs and ones abandoned mid-run (process-job reclaims them), and
 * re-indexes materials whose RAG indexing failed. Captures are normally
 * processed right after submission; this catches what a timeout or crash
 * left behind.
 *
 * Schedule every ~10 minutes with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this header itself when CRON_SECRET is set).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set" },
      { status: 503 },
    );
  }
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await claimQueuedJobs({ all: true }, 5);
  const processed: Awaited<ReturnType<typeof processIngestionJob>>[] = [];
  for (const job of jobs) processed.push(await processIngestionJob(job));

  // Materials whose text was read but indexing failed (e.g. embedding outage)
  const unindexed = await pgDb
    .select({ id: CourseMaterialSchema.id })
    .from(CourseMaterialSchema)
    .where(
      and(
        eq(CourseMaterialSchema.transcriptStatus, "extracted"),
        eq(CourseMaterialSchema.ragIndexStatus, "failed"),
        isNull(CourseMaterialSchema.deletedAt),
      ),
    )
    .limit(10);
  let reindexed = 0;
  for (const { id } of unindexed) {
    try {
      await indexCourseMaterial(id);
      reindexed++;
    } catch (error) {
      logger.warn(`[cron] re-index of ${id} failed again`, error);
    }
  }

  return NextResponse.json({ processed, reindexed });
}

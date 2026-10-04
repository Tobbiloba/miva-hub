import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { getIngestUserId } from "@/lib/extension/token";
import {
  type JobScope,
  claimQueuedJobs,
  processIngestionJob,
} from "@/lib/ingest/process-job";
import { eq } from "drizzle-orm";
import logger from "logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ingest/process-jobs — process queued ingestion jobs.
 *
 * Captures are normally processed right after submission (ingest/lesson);
 * this endpoint retries anything left queued. Scope follows the caller:
 * super_admin → every tenant, admin → their university, anyone else → only
 * their own jobs. Jobs are claimed atomically, so concurrent calls never
 * process the same job twice.
 */
export async function POST(_request: NextRequest) {
  try {
    const userId = await getIngestUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const [userRow] = await pgDb
      .select({ role: UserSchema.role, universityId: UserSchema.universityId })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    let scope: JobScope;
    if (userRow?.role === "super_admin") {
      scope = { all: true };
    } else if (userRow?.role === "admin") {
      if (!userRow.universityId) {
        return NextResponse.json(
          { error: "Your account is not linked to a university" },
          { status: 403 },
        );
      }
      scope = { universityId: userRow.universityId };
    } else {
      scope = { volunteerId: userId };
    }

    // Limit per request to stay inside function timeouts
    const jobs = await claimQueuedJobs(scope, 5);
    if (jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "No queued jobs" });
    }

    const results: Awaited<ReturnType<typeof processIngestionJob>>[] = [];
    for (const job of jobs) {
      results.push(await processIngestionJob(job));
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    logger.error("[ingest/process-jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

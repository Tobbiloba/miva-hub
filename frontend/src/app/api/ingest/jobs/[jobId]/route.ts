import { pgDb } from "@/lib/db/pg/db.pg";
import { IngestionJobSchema } from "@/lib/db/pg/schema.pg";
import { getIngestUserId } from "@/lib/extension/token";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const userId = await getIngestUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { jobId } = await params;

    const [job] = await pgDb
      .select({
        id: IngestionJobSchema.id,
        status: IngestionJobSchema.status,
        contentType: IngestionJobSchema.contentType,
        lessonTitle: IngestionJobSchema.lessonTitle,
        errorMessage: IngestionJobSchema.errorMessage,
        courseMaterialId: IngestionJobSchema.courseMaterialId,
        completedAt: IngestionJobSchema.completedAt,
        createdAt: IngestionJobSchema.createdAt,
      })
      .from(IngestionJobSchema)
      // Only the user who submitted the capture can see its job
      .where(
        and(
          eq(IngestionJobSchema.id, jobId),
          eq(IngestionJobSchema.volunteerId, userId),
        ),
      )
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("[ingest/jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

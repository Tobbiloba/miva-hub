import { getApiSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { canManageMaterial } from "@/lib/material-access";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const session = await getApiSession();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await context.params;

    // Get processing job status
    const processingJob = await pgAcademicRepository.getAIProcessingJob(jobId);

    // Scope: only the uploader/owner, a same-tenant admin, or a course
    // instructor may read job status + extracted text. Foreign jobs look
    // missing (no existence leak).
    const material = processingJob
      ? await pgAcademicRepository.getCourseMaterialById(
          processingJob.courseMaterialId,
        )
      : null;
    if (
      !processingJob ||
      !material ||
      !(await canManageMaterial(session.user.id, material))
    ) {
      return NextResponse.json(
        { error: "Processing job not found" },
        { status: 404 },
      );
    }

    // Get processed content if completed
    let processedContent: Awaited<
      ReturnType<typeof pgAcademicRepository.getAIProcessedContent>
    > = null;
    if (processingJob.status === "completed") {
      processedContent = await pgAcademicRepository.getAIProcessedContent(
        processingJob.courseMaterialId,
      );
    }

    return NextResponse.json({
      jobId: processingJob.id,
      status: processingJob.status,
      jobType: processingJob.jobType,
      startedAt: processingJob.startedAt,
      completedAt: processingJob.completedAt,
      errorMessage: processingJob.errorMessage,
      metadata: processingJob.metadata,
      processedContent: processedContent
        ? {
            extractedText: processedContent.extractedText,
            aiSummary: processedContent.aiSummary,
            keyConcepts: processedContent.keyConcepts,
            difficulty: processedContent.difficulty,
            estimatedReadTime: processedContent.estimatedReadTime,
            wordCount: processedContent.wordCount,
            qualityScore: processedContent.qualityScore,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching processing status:", error);
    return NextResponse.json(
      { error: "Failed to fetch processing status" },
      { status: 500 },
    );
  }
}

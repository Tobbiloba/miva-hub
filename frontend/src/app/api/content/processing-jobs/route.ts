import { NextRequest, NextResponse } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { requireAdmin } from "@/lib/auth/admin";
import { eq, desc, and, count } from "drizzle-orm";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { AIProcessingJobSchema, CourseMaterialSchema } from "@/lib/db/pg/schema.pg";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(AIProcessingJobSchema.status, status as any));
    }

    // Get processing jobs with course material info
    const jobs = await db
      .select({
        id: AIProcessingJobSchema.id,
        courseMaterialId: AIProcessingJobSchema.courseMaterialId,
        jobType: AIProcessingJobSchema.jobType,
        status: AIProcessingJobSchema.status,
        startedAt: AIProcessingJobSchema.startedAt,
        completedAt: AIProcessingJobSchema.completedAt,
        errorMessage: AIProcessingJobSchema.errorMessage,
        metadata: AIProcessingJobSchema.metadata,
        createdAt: AIProcessingJobSchema.createdAt,
        materialTitle: CourseMaterialSchema.title,
        materialType: CourseMaterialSchema.materialType,
        fileName: CourseMaterialSchema.fileName,
        courseId: CourseMaterialSchema.courseId,
      })
      .from(AIProcessingJobSchema)
      .leftJoin(CourseMaterialSchema, eq(AIProcessingJobSchema.courseMaterialId, CourseMaterialSchema.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(AIProcessingJobSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count(AIProcessingJobSchema.id) })
      .from(AIProcessingJobSchema)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCount = totalCountResult[0]?.count || 0;

    // Calculate statistics
    const stats = await db
      .select({
        status: AIProcessingJobSchema.status,
        count: count(AIProcessingJobSchema.id),
      })
      .from(AIProcessingJobSchema)
      .groupBy(AIProcessingJobSchema.status);

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        courseMaterialId: job.courseMaterialId,
        jobType: job.jobType,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        metadata: job.metadata,
        createdAt: job.createdAt,
        material: {
          title: job.materialTitle,
          type: job.materialType,
          fileName: job.fileName,
          courseId: job.courseId,
        },
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      statistics: {
        total: totalCount,
        pending: statusCounts.pending || 0,
        processing: statusCounts.processing || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0,
      },
    });

  } catch (error) {
    console.error("Error fetching processing jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch processing jobs" },
      { status: 500 }
    );
  }
}
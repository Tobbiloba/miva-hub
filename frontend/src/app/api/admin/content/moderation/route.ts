import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * GET /api/admin/content/moderation
 * List unpublished volunteer-captured materials awaiting moderation.
 */
export async function GET(request: NextRequest) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof NextResponse) return adminAccess;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "50"));
  const offset = (page - 1) * limit;
  const transcriptFilter = searchParams.get("transcriptStatus"); // optional filter

  const volunteer = pgDb
    .select({
      id: UserSchema.id,
      name: UserSchema.name,
      email: UserSchema.email,
    })
    .from(UserSchema)
    .as("volunteer");

  const baseWhere = and(
    eq(CourseMaterialSchema.isPublished, false),
    eq(CourseMaterialSchema.ingestionSource, "volunteer_extension"),
    isNull(CourseMaterialSchema.deletedAt),
    ...(transcriptFilter
      ? [eq(CourseMaterialSchema.transcriptStatus, transcriptFilter as any)]
      : [])
  );

  const items = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      description: CourseMaterialSchema.description,
      materialType: CourseMaterialSchema.materialType,
      mimeType: CourseMaterialSchema.mimeType,
      fileName: CourseMaterialSchema.fileName,
      fileSize: CourseMaterialSchema.fileSize,
      contentUrl: CourseMaterialSchema.contentUrl,
      publicUrl: CourseMaterialSchema.publicUrl,
      weekNumber: CourseMaterialSchema.weekNumber,
      ingestionSource: CourseMaterialSchema.ingestionSource,
      createdAt: CourseMaterialSchema.createdAt,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
      volunteerName: volunteer.name,
      volunteerEmail: volunteer.email,
      transcriptStatus: CourseMaterialSchema.transcriptStatus,
      transcriptWordCount: CourseMaterialSchema.transcriptWordCount,
      transcriptErrorMessage: CourseMaterialSchema.transcriptErrorMessage,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .leftJoin(volunteer, eq(CourseMaterialSchema.volunteerId, volunteer.id))
    .where(baseWhere)
    .orderBy(sql`${CourseMaterialSchema.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await pgDb
    .select({ count: sql<number>`count(*)::int` })
    .from(CourseMaterialSchema)
    .where(baseWhere);

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  });
}

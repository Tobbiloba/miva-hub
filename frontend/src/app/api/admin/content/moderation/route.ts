import { requireAdmin } from "@/lib/auth/admin";
import { getAdminScope } from "@/lib/tenant";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/content/moderation
 * List captures awaiting moderation in the admin's university: volunteer
 * captures, plus students' private captures they may share with the course.
 */
export async function GET(request: NextRequest) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof NextResponse) return adminAccess;

  const scope = await getAdminScope(adminAccess.user.id);
  if (!scope.superAdmin && !scope.university) {
    return NextResponse.json(
      { error: "Your account is not linked to a university" },
      { status: 403 },
    );
  }

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
    // Private-only student captures (personal pages, declined shares) are
    // never shown to moderators.
    or(
      isNull(CourseMaterialSchema.ownerUserId),
      eq(CourseMaterialSchema.shareable, true),
    ),
    ...(scope.superAdmin
      ? []
      : [eq(CourseSchema.universityId, scope.university!.id)]),
    ...(transcriptFilter
      ? [eq(CourseMaterialSchema.transcriptStatus, transcriptFilter as any)]
      : []),
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
      isStudentShareRequest: sql<boolean>`${CourseMaterialSchema.ownerUserId} IS NOT NULL`,
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
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
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

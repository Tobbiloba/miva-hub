import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { isSameTenant } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  status: z
    .enum(["enrolled", "dropped", "completed", "failed", "withdrawn"])
    .optional(),
  finalGrade: z.string().nullable().optional(),
  gradePoints: z.string().nullable().optional(),
});

/**
 * Enrollments inherit their tenant from the course — admins may only touch
 * enrollments in their own university's courses (prevents cross-university
 * IDOR). Returns null for missing AND foreign rows (404, no existence leak).
 */
async function findTenantEnrollment(adminUserId: string, enrollmentId: string) {
  const [row] = await pgDb
    .select({
      enrollment: StudentEnrollmentSchema,
      universityId: CourseSchema.universityId,
    })
    .from(StudentEnrollmentSchema)
    .innerJoin(
      CourseSchema,
      eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
    )
    .where(eq(StudentEnrollmentSchema.id, enrollmentId))
    .limit(1);
  if (!row || !(await isSameTenant(adminUserId, row.universityId))) return null;
  return row.enrollment;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;
    const body = await request.json();
    const validated = updateEnrollmentSchema.parse(body);

    const existing = await findTenantEnrollment(adminAccess.user.id, id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 },
      );
    }

    const [updated] = await pgDb
      .update(StudentEnrollmentSchema)
      .set({ ...validated, updatedAt: new Date() })
      .where(
        and(
          eq(StudentEnrollmentSchema.id, id),
          eq(StudentEnrollmentSchema.courseId, existing.courseId),
        ),
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Enrollment updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update enrollment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;

    const existing = await findTenantEnrollment(adminAccess.user.id, id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 },
      );
    }

    await pgDb
      .delete(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.id, id),
          eq(StudentEnrollmentSchema.courseId, existing.courseId),
        ),
      );

    return NextResponse.json({
      success: true,
      message: "Enrollment deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete enrollment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

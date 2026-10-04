import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseInstructorSchema, CourseSchema } from "@/lib/db/pg/schema.pg";
import { isSameTenant } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["primary", "assistant", "lab_instructor", "grader"]),
});

/**
 * Instructor assignments inherit their tenant from the course — admins may
 * only manage instructors of their own university's courses (prevents
 * cross-university IDOR). Returns the course's universityId, or null when
 * the course is missing or foreign (→ 404, no existence leak).
 */
async function tenantCourseUniversity(
  adminUserId: string,
  courseId: string,
): Promise<string | null> {
  const [course] = await pgDb
    .select({ universityId: CourseSchema.universityId })
    .from(CourseSchema)
    .where(eq(CourseSchema.id, courseId))
    .limit(1);
  if (!course || !(await isSameTenant(adminUserId, course.universityId))) {
    return null;
  }
  return course.universityId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facultyId: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: courseId, facultyId } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    if (!(await tenantCourseUniversity(adminAccess.user.id, courseId))) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    const [existing] = await pgDb
      .select()
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.facultyId, facultyId),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    const [updated] = await pgDb
      .update(CourseInstructorSchema)
      .set({ role: validated.role })
      .where(
        and(
          eq(CourseInstructorSchema.id, existing.id),
          eq(CourseInstructorSchema.courseId, courseId),
        ),
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Role updated successfully",
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
        error: "Failed to update role",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; facultyId: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: courseId, facultyId } = await params;

    if (!(await tenantCourseUniversity(adminAccess.user.id, courseId))) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    const [existing] = await pgDb
      .select()
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.facultyId, facultyId),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    await pgDb
      .delete(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.id, existing.id),
          eq(CourseInstructorSchema.courseId, courseId),
        ),
      );

    return NextResponse.json({
      success: true,
      message: "Faculty removed from course successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove faculty",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

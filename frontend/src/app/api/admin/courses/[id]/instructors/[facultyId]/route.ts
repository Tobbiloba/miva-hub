import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseInstructorSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["primary", "assistant", "lab_instructor", "grader"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facultyId: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: courseId, facultyId } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    const [existing] = await pgDb
      .select()
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.facultyId, facultyId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    const [updated] = await pgDb
      .update(CourseInstructorSchema)
      .set({ role: validated.role })
      .where(eq(CourseInstructorSchema.id, existing.id))
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
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update role",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; facultyId: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: courseId, facultyId } = await params;

    const [existing] = await pgDb
      .select()
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.facultyId, facultyId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    await pgDb
      .delete(CourseInstructorSchema)
      .where(eq(CourseInstructorSchema.id, existing.id));

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
      { status: 500 }
    );
  }
}

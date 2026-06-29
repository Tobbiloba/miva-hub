import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  status: z
    .enum(["enrolled", "dropped", "completed", "failed", "withdrawn"])
    .optional(),
  finalGrade: z.string().nullable().optional(),
  gradePoints: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;
    const body = await request.json();
    const validated = updateEnrollmentSchema.parse(body);

    const [existing] = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 }
      );
    }

    const [updated] = await pgDb
      .update(StudentEnrollmentSchema)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(StudentEnrollmentSchema.id, id))
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
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update enrollment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;

    const [existing] = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 }
      );
    }

    await pgDb
      .delete(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.id, id));

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
      { status: 500 }
    );
  }
}

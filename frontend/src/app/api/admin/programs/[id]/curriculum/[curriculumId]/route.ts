import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProgramCurriculumSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCurriculumSchema = z.object({
  isCompulsory: z.boolean().optional(),
  orderInSemester: z.number().int().positive().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; curriculumId: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { curriculumId } = await params;
    const body = await request.json();
    const validated = updateCurriculumSchema.parse(body);

    const [existing] = await pgDb
      .select()
      .from(ProgramCurriculumSchema)
      .where(eq(ProgramCurriculumSchema.id, curriculumId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Curriculum entry not found" },
        { status: 404 }
      );
    }

    const [updated] = await pgDb
      .update(ProgramCurriculumSchema)
      .set(validated)
      .where(eq(ProgramCurriculumSchema.id, curriculumId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Curriculum entry updated",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update curriculum entry",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; curriculumId: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { curriculumId } = await params;

    const [existing] = await pgDb
      .select()
      .from(ProgramCurriculumSchema)
      .where(eq(ProgramCurriculumSchema.id, curriculumId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Curriculum entry not found" },
        { status: 404 }
      );
    }

    await pgDb
      .delete(ProgramCurriculumSchema)
      .where(eq(ProgramCurriculumSchema.id, curriculumId));

    return NextResponse.json({
      success: true,
      message: "Curriculum entry removed",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete curriculum entry",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

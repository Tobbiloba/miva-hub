import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProgramCurriculumSchema, ProgramSchema } from "@/lib/db/pg/schema.pg";
import { isSameTenant } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateCurriculumSchema = z.object({
  isCompulsory: z.boolean().optional(),
  orderInSemester: z.number().int().positive().nullable().optional(),
});

/**
 * Curriculum entries inherit their tenant from the program. The entry must
 * belong to the program in the URL AND that program to the admin's
 * university (prevents cross-university IDOR). Missing/foreign → null → 404.
 */
async function findTenantEntry(
  adminUserId: string,
  programId: string,
  curriculumId: string,
) {
  const [row] = await pgDb
    .select({
      entry: ProgramCurriculumSchema,
      universityId: ProgramSchema.universityId,
    })
    .from(ProgramCurriculumSchema)
    .innerJoin(
      ProgramSchema,
      eq(ProgramCurriculumSchema.programId, ProgramSchema.id),
    )
    .where(
      and(
        eq(ProgramCurriculumSchema.id, curriculumId),
        eq(ProgramCurriculumSchema.programId, programId),
      ),
    )
    .limit(1);
  if (!row || !(await isSameTenant(adminUserId, row.universityId))) return null;
  return row.entry;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; curriculumId: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: programId, curriculumId } = await params;
    const body = await request.json();
    const validated = updateCurriculumSchema.parse(body);

    const existing = await findTenantEntry(
      adminAccess.user.id,
      programId,
      curriculumId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Curriculum entry not found" },
        { status: 404 },
      );
    }

    const [updated] = await pgDb
      .update(ProgramCurriculumSchema)
      .set(validated)
      .where(
        and(
          eq(ProgramCurriculumSchema.id, curriculumId),
          eq(ProgramCurriculumSchema.programId, programId),
        ),
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Curriculum entry updated",
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
        error: "Failed to update curriculum entry",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; curriculumId: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: programId, curriculumId } = await params;

    const existing = await findTenantEntry(
      adminAccess.user.id,
      programId,
      curriculumId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Curriculum entry not found" },
        { status: 404 },
      );
    }

    await pgDb
      .delete(ProgramCurriculumSchema)
      .where(
        and(
          eq(ProgramCurriculumSchema.id, curriculumId),
          eq(ProgramCurriculumSchema.programId, programId),
        ),
      );

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
      { status: 500 },
    );
  }
}

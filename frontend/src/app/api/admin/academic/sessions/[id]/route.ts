import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AcademicSessionSchema, StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const updateSessionSchema = z.object({
  currentSemester: z.enum(["first", "second"]).optional(),
  firstSemStart: z.string().nullable().optional(),
  firstSemEnd: z.string().nullable().optional(),
  secondSemStart: z.string().nullable().optional(),
  secondSemEnd: z.string().nullable().optional(),
  status: z.enum(["upcoming", "active", "closed"]).optional(),
  isCurrent: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    const [session] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Academic session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch academic session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSessionSchema.parse(body);

    // Check session exists
    const [existing] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Academic session not found" },
        { status: 404 }
      );
    }

    // If setting as current, enforce single-active invariant
    if (validatedData.isCurrent === true) {
      const [updated] = await pgDb.transaction(async (tx) => {
        await tx
          .update(AcademicSessionSchema)
          .set({ isCurrent: false, updatedAt: new Date() })
          .where(eq(AcademicSessionSchema.isCurrent, true));

        return tx
          .update(AcademicSessionSchema)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(AcademicSessionSchema.id, id))
          .returning();
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Academic session updated and set as current",
      });
    }

    const [updated] = await pgDb
      .update(AcademicSessionSchema)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(AcademicSessionSchema.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Academic session updated successfully",
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
        error: "Failed to update academic session",
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
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    const [session] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Academic session not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of upcoming sessions or sessions with no enrollments
    if (session.status !== "upcoming") {
      // Check for enrollments referencing this session
      const [enrollmentCount] = await pgDb
        .select({ count: sql<number>`count(*)` })
        .from(StudentEnrollmentSchema)
        .where(eq(StudentEnrollmentSchema.academicYear, session.sessionName));

      if (Number(enrollmentCount.count) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete session with existing enrollments",
            details: { enrollmentCount: Number(enrollmentCount.count) },
          },
          { status: 400 }
        );
      }
    }

    if (session.isCurrent) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the current active session" },
        { status: 400 }
      );
    }

    await pgDb
      .delete(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.id, id));

    return NextResponse.json({
      success: true,
      message: "Academic session deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete academic session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

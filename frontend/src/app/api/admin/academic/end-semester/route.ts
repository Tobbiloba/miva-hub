import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  ProgramSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const body = await request.json();
    const dryRun = body.dryRun === true;

    // Get current active session
    const [currentSession] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.isCurrent, true))
      .limit(1);

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: "No active academic session found" },
        { status: 400 },
      );
    }

    if (currentSession.currentSemester !== "first") {
      return NextResponse.json(
        {
          success: false,
          error: "Current session is already in the second semester",
        },
        { status: 400 },
      );
    }

    // Count students who will be affected, broken down by level and program
    const affectedStudents = await pgDb
      .select({
        currentLevel: UserSchema.currentLevel,
        programId: UserSchema.programId,
        programName: ProgramSchema.name,
        count: sql<number>`count(*)`,
      })
      .from(UserSchema)
      .leftJoin(ProgramSchema, eq(UserSchema.programId, ProgramSchema.id))
      .where(
        and(
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.currentSemester, "first"),
          eq(UserSchema.role, "student"),
        ),
      )
      .groupBy(
        UserSchema.currentLevel,
        UserSchema.programId,
        ProgramSchema.name,
      );

    const totalAffected = affectedStudents.reduce(
      (sum, row) => sum + Number(row.count),
      0,
    );

    // Build breakdown by level
    const byLevel: Record<number, number> = {};
    for (const row of affectedStudents) {
      const level = row.currentLevel ?? 100;
      byLevel[level] = (byLevel[level] || 0) + Number(row.count);
    }

    // Build breakdown by program
    const byProgram: Record<string, number> = {};
    for (const row of affectedStudents) {
      const name = row.programName ?? "Unassigned";
      byProgram[name] = (byProgram[name] || 0) + Number(row.count);
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          sessionName: currentSession.sessionName,
          currentSemester: "first",
          targetSemester: "second",
          totalAffected,
          byLevel,
          byProgram,
        },
      });
    }

    // Execute the transition in a transaction
    const result = await pgDb.transaction(async (tx) => {
      // Step 1: Move all active first-semester students to second semester
      const updatedStudents = await tx
        .update(UserSchema)
        .set({
          currentSemester: "second",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(UserSchema.enrollmentStatus, "active"),
            eq(UserSchema.currentSemester, "first"),
            eq(UserSchema.role, "student"),
          ),
        )
        .returning({ id: UserSchema.id });

      // Step 2: Update the academic session's current semester
      await tx
        .update(AcademicSessionSchema)
        .set({
          currentSemester: "second",
          updatedAt: new Date(),
        })
        .where(eq(AcademicSessionSchema.isCurrent, true));

      return { studentsUpdated: updatedStudents.length };
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      data: {
        sessionName: currentSession.sessionName,
        studentsUpdated: result.studentsUpdated,
        previousSemester: "first",
        newSemester: "second",
        byLevel,
        byProgram,
      },
      message: `Successfully ended first semester. ${result.studentsUpdated} students moved to second semester.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to end semester",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

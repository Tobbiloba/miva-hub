import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  UserSchema,
  ProgramSchema,
} from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const endSessionSchema = z.object({
  dryRun: z.boolean().default(false),
  nextSessionName: z
    .string()
    .trim()
    .min(1, "Next session name is required")
    .max(50, "Session name too long"),
});

// Graduation threshold: current_level >= program.duration_years * 100
// Falls back to 400 (4-year default) when program_id is null.
const DEFAULT_GRADUATION_LEVEL = 400;

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const body = await request.json();
    const validatedData = endSessionSchema.parse(body);
    const { dryRun, nextSessionName } = validatedData;

    // Tenant scope: end-session only affects the admin's own university.
    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        {
          success: false,
          error: "No university associated with your account",
          message:
            "Ending an academic session requires a university-scoped admin. Super admins must act within a specific university.",
        },
        { status: 403 }
      );
    }

    // Get current active session for this university
    const [currentSession] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(
        and(
          eq(AcademicSessionSchema.isCurrent, true),
          eq(AcademicSessionSchema.universityId, university.id)
        )
      )
      .limit(1);

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: "No active academic session found" },
        { status: 400 }
      );
    }

    // Graduation level per student: COALESCE(program.duration_years * 100, 400)
    const gradLevelExpr = sql`COALESCE(${ProgramSchema.durationYears} * 100, ${DEFAULT_GRADUATION_LEVEL})`;

    // Count graduating students (level >= program graduation level)
    const graduatingStudents = await pgDb
      .select({
        currentLevel: UserSchema.currentLevel,
        programName: ProgramSchema.name,
        count: sql<number>`count(*)`,
      })
      .from(UserSchema)
      .leftJoin(ProgramSchema, eq(UserSchema.programId, ProgramSchema.id))
      .where(
        and(
          eq(UserSchema.universityId, university.id),
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.role, "student"),
          sql`${UserSchema.currentLevel} >= ${gradLevelExpr}`
        )
      )
      .groupBy(UserSchema.currentLevel, ProgramSchema.name);

    const totalGraduating = graduatingStudents.reduce(
      (sum, row) => sum + Number(row.count),
      0
    );

    // Count advancing students (active, level < graduation level)
    const advancingStudents = await pgDb
      .select({
        currentLevel: UserSchema.currentLevel,
        programName: ProgramSchema.name,
        count: sql<number>`count(*)`,
      })
      .from(UserSchema)
      .leftJoin(ProgramSchema, eq(UserSchema.programId, ProgramSchema.id))
      .where(
        and(
          eq(UserSchema.universityId, university.id),
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.role, "student"),
          sql`${UserSchema.currentLevel} < ${gradLevelExpr}`
        )
      )
      .groupBy(UserSchema.currentLevel, ProgramSchema.name);

    const totalAdvancing = advancingStudents.reduce(
      (sum, row) => sum + Number(row.count),
      0
    );

    // Build level advancement breakdown
    const levelAdvancement: Record<string, number> = {};
    for (const row of advancingStudents) {
      const from = row.currentLevel ?? 100;
      const to = from + 100;
      const key = `${from}L → ${to}L`;
      levelAdvancement[key] = (levelAdvancement[key] || 0) + Number(row.count);
    }

    // Total active students
    const [totalActiveResult] = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(UserSchema)
      .where(
        and(
          eq(UserSchema.universityId, university.id),
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.role, "student")
        )
      );
    const totalActive = Number(totalActiveResult.count);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          currentSessionName: currentSession.sessionName,
          nextSessionName,
          totalActive,
          totalAdvancing,
          totalGraduating,
          levelAdvancement,
          graduatingByProgram: graduatingStudents.reduce(
            (acc, row) => {
              const name = row.programName ?? "Unassigned";
              acc[name] = (acc[name] || 0) + Number(row.count);
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      });
    }

    // Execute the full session transition in a single transaction
    const result = await pgDb.transaction(async (tx) => {
      // Step 1: Mark graduating students (level >= program.duration_years * 100)
      // Use a subquery since we can't join in an UPDATE with Drizzle easily
      const graduated = await tx
        .update(UserSchema)
        .set({
          enrollmentStatus: "graduated",
          graduationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(UserSchema.universityId, university.id),
            eq(UserSchema.enrollmentStatus, "active"),
            eq(UserSchema.role, "student"),
            sql`${UserSchema.currentLevel} >= COALESCE((SELECT p.duration_years * 100 FROM program p WHERE p.id = ${UserSchema.programId}), ${DEFAULT_GRADUATION_LEVEL})`
          )
        )
        .returning({ id: UserSchema.id });

      // Step 2: Advance remaining active students
      const advanced = await tx
        .update(UserSchema)
        .set({
          currentLevel: sql`${UserSchema.currentLevel} + 100`,
          currentSemester: "first",
          academicYear: nextSessionName,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(UserSchema.universityId, university.id),
            eq(UserSchema.enrollmentStatus, "active"),
            eq(UserSchema.role, "student")
          )
        )
        .returning({ id: UserSchema.id });

      // Step 3: Close current session
      await tx
        .update(AcademicSessionSchema)
        .set({
          isCurrent: false,
          status: "closed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(AcademicSessionSchema.isCurrent, true),
            eq(AcademicSessionSchema.universityId, university.id)
          )
        );

      // Step 4: Create or activate next session
      // Check if it already exists within this university
      const [existingNext] = await tx
        .select()
        .from(AcademicSessionSchema)
        .where(
          and(
            eq(AcademicSessionSchema.sessionName, nextSessionName),
            eq(AcademicSessionSchema.universityId, university.id)
          )
        )
        .limit(1);

      if (existingNext) {
        await tx
          .update(AcademicSessionSchema)
          .set({
            isCurrent: true,
            currentSemester: "first",
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(AcademicSessionSchema.id, existingNext.id));
      } else {
        await tx.insert(AcademicSessionSchema).values({
          universityId: university.id,
          sessionName: nextSessionName,
          currentSemester: "first",
          isCurrent: true,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        graduatedCount: graduated.length,
        advancedCount: advanced.length,
      };
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      data: {
        previousSession: currentSession.sessionName,
        newSession: nextSessionName,
        graduatedCount: result.graduatedCount,
        advancedCount: result.advancedCount,
        levelAdvancement,
      },
      message: `Session ended. ${result.graduatedCount} students graduated, ${result.advancedCount} students advanced to next level.`,
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
        error: "Failed to end session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  UserSchema,
  ProgramSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, sql, gte } from "drizzle-orm";
import { z } from "zod";

const endSessionSchema = z.object({
  dryRun: z.boolean().default(false),
  nextSessionName: z
    .string()
    .min(1, "Next session name is required")
    .regex(
      /^\d{4}\/\d{4}$/,
      "Session name must be in format YYYY/YYYY (e.g. 2026/2027)"
    )
    .refine((val) => {
      const [start, end] = val.split("/").map(Number);
      return end === start + 1;
    }, "Second year must be exactly one year after the first"),
});

// Graduation threshold: current_level >= 400
// Simplification: we treat 400L as the final year for all programs.
// TODO: Replace with program.duration_years when programs are fully wired.
const GRADUATION_LEVEL = 400;

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const body = await request.json();
    const validatedData = endSessionSchema.parse(body);
    const { dryRun, nextSessionName } = validatedData;

    // Get current active session
    const [currentSession] = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.isCurrent, true))
      .limit(1);

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: "No active academic session found" },
        { status: 400 }
      );
    }

    // Count graduating students (level >= 400)
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
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.role, "student"),
          gte(UserSchema.currentLevel, GRADUATION_LEVEL)
        )
      )
      .groupBy(UserSchema.currentLevel, ProgramSchema.name);

    const totalGraduating = graduatingStudents.reduce(
      (sum, row) => sum + Number(row.count),
      0
    );

    // Count advancing students (active, level < 400)
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
          eq(UserSchema.enrollmentStatus, "active"),
          eq(UserSchema.role, "student"),
          sql`${UserSchema.currentLevel} < ${GRADUATION_LEVEL}`
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
      // Step 1: Mark graduating students
      const graduated = await tx
        .update(UserSchema)
        .set({
          enrollmentStatus: "graduated",
          graduationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(UserSchema.enrollmentStatus, "active"),
            eq(UserSchema.role, "student"),
            gte(UserSchema.currentLevel, GRADUATION_LEVEL)
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
        .where(eq(AcademicSessionSchema.isCurrent, true));

      // Step 4: Create or activate next session
      // Check if it already exists
      const [existingNext] = await tx
        .select()
        .from(AcademicSessionSchema)
        .where(eq(AcademicSessionSchema.sessionName, nextSessionName))
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
        { success: false, error: "Validation failed", details: error.errors },
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

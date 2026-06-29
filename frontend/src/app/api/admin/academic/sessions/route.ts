import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AcademicSessionSchema } from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSessionSchema = z.object({
  sessionName: z
    .string()
    .trim()
    .min(1, "Session name is required")
    .max(50, "Session name too long"),
  currentSemester: z.enum(["first", "second"]).default("first"),
  firstSemStart: z.string().optional(),
  firstSemEnd: z.string().optional(),
  secondSemStart: z.string().optional(),
  secondSemEnd: z.string().optional(),
  isCurrent: z.boolean().default(false),
  status: z.enum(["upcoming", "active", "closed"]).default("upcoming"),
});

export async function GET() {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const sessions = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .orderBy(desc(AcademicSessionSchema.sessionName));

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch academic sessions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // Tenant scope: a session belongs to the admin's university.
    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        {
          success: false,
          error: "No university associated with your account",
          message:
            "Academic session creation requires a university-scoped admin. Super admins must act within a specific university.",
        },
        { status: 403 }
      );
    }

    // Check if session name already exists for this university
    const existing = await pgDb
      .select()
      .from(AcademicSessionSchema)
      .where(
        and(
          eq(AcademicSessionSchema.sessionName, validatedData.sessionName),
          eq(AcademicSessionSchema.universityId, university.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Session "${validatedData.sessionName}" already exists` },
        { status: 400 }
      );
    }

    // If setting as current, use transaction to ensure single-active invariant
    if (validatedData.isCurrent) {
      const [newSession] = await pgDb.transaction(async (tx) => {
        // Clear any existing current session
        await tx
          .update(AcademicSessionSchema)
          .set({ isCurrent: false, updatedAt: new Date() })
          .where(
            and(
              eq(AcademicSessionSchema.isCurrent, true),
              eq(AcademicSessionSchema.universityId, university.id)
            )
          );

        return tx
          .insert(AcademicSessionSchema)
          .values({
            universityId: university.id,
            sessionName: validatedData.sessionName,
            currentSemester: validatedData.currentSemester,
            isCurrent: true,
            firstSemStart: validatedData.firstSemStart || null,
            firstSemEnd: validatedData.firstSemEnd || null,
            secondSemStart: validatedData.secondSemStart || null,
            secondSemEnd: validatedData.secondSemEnd || null,
            status: validatedData.status === "upcoming" ? "active" : validatedData.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      });

      return NextResponse.json(
        { success: true, data: newSession, message: "Academic session created and set as current" },
        { status: 201 }
      );
    }

    const [newSession] = await pgDb
      .insert(AcademicSessionSchema)
      .values({
        universityId: university.id,
        sessionName: validatedData.sessionName,
        currentSemester: validatedData.currentSemester,
        isCurrent: false,
        firstSemStart: validatedData.firstSemStart || null,
        firstSemEnd: validatedData.firstSemEnd || null,
        secondSemStart: validatedData.secondSemStart || null,
        secondSemEnd: validatedData.secondSemEnd || null,
        status: validatedData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newSession, message: "Academic session created successfully" },
      { status: 201 }
    );
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
        error: "Failed to create academic session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProgramCurriculumSchema,
  CourseSchema,
  ProgramSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createCurriculumSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  level: z
    .number()
    .int()
    .refine((v) => [100, 200, 300, 400, 500].includes(v), {
      message: "Level must be 100, 200, 300, 400, or 500",
    }),
  semester: z.enum(["first", "second"]),
  isCompulsory: z.boolean().default(true),
  orderInSemester: z.number().int().positive().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: programId } = await params;

    // Verify program exists
    const [program] = await pgDb
      .select({ id: ProgramSchema.id })
      .from(ProgramSchema)
      .where(eq(ProgramSchema.id, programId))
      .limit(1);

    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 }
      );
    }

    const entries = await pgDb
      .select({
        id: ProgramCurriculumSchema.id,
        courseId: ProgramCurriculumSchema.courseId,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        credits: CourseSchema.credits,
        level: ProgramCurriculumSchema.level,
        semester: ProgramCurriculumSchema.semester,
        isCompulsory: ProgramCurriculumSchema.isCompulsory,
        orderInSemester: ProgramCurriculumSchema.orderInSemester,
      })
      .from(ProgramCurriculumSchema)
      .innerJoin(
        CourseSchema,
        eq(ProgramCurriculumSchema.courseId, CourseSchema.id)
      )
      .where(eq(ProgramCurriculumSchema.programId, programId))
      .orderBy(
        asc(ProgramCurriculumSchema.level),
        asc(ProgramCurriculumSchema.semester),
        asc(ProgramCurriculumSchema.orderInSemester)
      );

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch curriculum",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: programId } = await params;
    const body = await request.json();
    const validated = createCurriculumSchema.parse(body);

    // Verify program exists
    const [program] = await pgDb
      .select({ id: ProgramSchema.id })
      .from(ProgramSchema)
      .where(eq(ProgramSchema.id, programId))
      .limit(1);

    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 }
      );
    }

    // Verify course exists
    const [course] = await pgDb
      .select({ id: CourseSchema.id, courseCode: CourseSchema.courseCode })
      .from(CourseSchema)
      .where(eq(CourseSchema.id, validated.courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    // Check for duplicate (composite unique will catch it, but give a clear message)
    const [existing] = await pgDb
      .select({ id: ProgramCurriculumSchema.id })
      .from(ProgramCurriculumSchema)
      .where(
        and(
          eq(ProgramCurriculumSchema.programId, programId),
          eq(ProgramCurriculumSchema.courseId, validated.courseId),
          eq(ProgramCurriculumSchema.level, validated.level),
          eq(ProgramCurriculumSchema.semester, validated.semester)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `${course.courseCode} is already mapped to this level and semester`,
        },
        { status: 409 }
      );
    }

    const [entry] = await pgDb
      .insert(ProgramCurriculumSchema)
      .values({
        programId,
        courseId: validated.courseId,
        level: validated.level,
        semester: validated.semester,
        isCompulsory: validated.isCompulsory,
        orderInSemester: validated.orderInSemester ?? null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: entry,
        message: `${course.courseCode} added to curriculum`,
      },
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
        error: "Failed to add curriculum entry",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

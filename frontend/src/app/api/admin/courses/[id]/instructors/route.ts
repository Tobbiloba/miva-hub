import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseInstructorSchema,
  CourseSchema,
  FacultySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const assignInstructorSchema = z.object({
  facultyId: z.string().uuid("Invalid faculty ID"),
  semester: z.string().min(1, "Semester is required"),
  role: z
    .enum(["primary", "assistant", "lab_instructor", "grader"])
    .default("primary"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id: courseId } = await params;

    const instructors = await pgDb
      .select({
        id: CourseInstructorSchema.id,
        facultyId: CourseInstructorSchema.facultyId,
        semester: CourseInstructorSchema.semester,
        role: CourseInstructorSchema.role,
        createdAt: CourseInstructorSchema.createdAt,
        facultyName: UserSchema.name,
        facultyEmail: UserSchema.email,
        position: FacultySchema.position,
      })
      .from(CourseInstructorSchema)
      .innerJoin(
        FacultySchema,
        eq(CourseInstructorSchema.facultyId, FacultySchema.id)
      )
      .innerJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
      .where(eq(CourseInstructorSchema.courseId, courseId))
      .orderBy(CourseInstructorSchema.createdAt);

    return NextResponse.json({ success: true, data: instructors });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch instructors",
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

    const { id: courseId } = await params;
    const body = await request.json();
    const validated = assignInstructorSchema.parse(body);

    // Verify course exists
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(eq(CourseSchema.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    // Verify faculty exists
    const [faculty] = await pgDb
      .select({ id: FacultySchema.id })
      .from(FacultySchema)
      .where(eq(FacultySchema.id, validated.facultyId))
      .limit(1);

    if (!faculty) {
      return NextResponse.json(
        { success: false, error: "Faculty member not found" },
        { status: 404 }
      );
    }

    // Check for duplicate assignment (unique: courseId + facultyId + semester)
    const [existing] = await pgDb
      .select({ id: CourseInstructorSchema.id })
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.facultyId, validated.facultyId),
          eq(CourseInstructorSchema.semester, validated.semester)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This faculty member is already assigned to this course for this semester",
        },
        { status: 400 }
      );
    }

    const [assignment] = await pgDb
      .insert(CourseInstructorSchema)
      .values({
        courseId,
        facultyId: validated.facultyId,
        semester: validated.semester,
        role: validated.role,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: assignment,
        message: "Faculty assigned to course successfully",
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
        error: "Failed to assign faculty",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

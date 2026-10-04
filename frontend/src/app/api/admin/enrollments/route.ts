import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getAdminScope } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createEnrollmentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  courseId: z.string().uuid("Invalid course ID"),
  semester: z.string().min(1, "Semester is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  status: z
    .enum(["enrolled", "dropped", "completed", "failed", "withdrawn"])
    .default("enrolled"),
});

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const body = await request.json();
    const validated = createEnrollmentSchema.parse(body);

    // Tenant scope from the SESSION: university admins may only enroll their
    // own students into their own courses. super_admin is unscoped but the
    // student and course must still belong to the same university.
    const scope = await getAdminScope(adminAccess.user.id);
    if (!scope.superAdmin && !scope.university) {
      return NextResponse.json(
        { success: false, error: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }
    const tenantId = scope.university?.id;

    // Verify student exists (in tenant)
    const [student] = await pgDb
      .select({ id: UserSchema.id, universityId: UserSchema.universityId })
      .from(UserSchema)
      .where(
        and(
          eq(UserSchema.id, validated.studentId),
          eq(UserSchema.role, "student"),
          ...(tenantId ? [eq(UserSchema.universityId, tenantId)] : []),
        ),
      )
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // Verify course exists (in the student's university)
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.id, validated.courseId),
          ...(student.universityId
            ? [eq(CourseSchema.universityId, student.universityId)]
            : []),
        ),
      )
      .limit(1);

    if (!course || !student.universityId) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // Check for duplicate enrollment (unique: studentId + courseId + semester)
    const [existing] = await pgDb
      .select({ id: StudentEnrollmentSchema.id })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, validated.studentId),
          eq(StudentEnrollmentSchema.courseId, validated.courseId),
          eq(StudentEnrollmentSchema.semester, validated.semester),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Student is already enrolled in this course for this semester",
        },
        { status: 400 },
      );
    }

    const [enrollment] = await pgDb
      .insert(StudentEnrollmentSchema)
      .values({
        studentId: validated.studentId,
        courseId: validated.courseId,
        semester: validated.semester,
        academicYear: validated.academicYear,
        status: validated.status,
        enrollmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: enrollment,
        message: "Student enrolled successfully",
      },
      { status: 201 },
    );
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
        error: "Failed to create enrollment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

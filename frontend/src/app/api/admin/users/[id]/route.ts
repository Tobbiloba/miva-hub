import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseInstructorSchema,
  CourseSchema,
  DepartmentSchema,
  FacultySchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getAdminScope } from "@/lib/tenant";
import { type SQL, and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant scope for user lookups: super_admins (by role) may touch any user;
 * university admins only their own tenant. A tenant admin without a
 * university matches nothing — never everything.
 */
async function userTenantFilter(
  adminUserId: string,
  targetUserId: string,
): Promise<SQL | undefined> {
  const scope = await getAdminScope(adminUserId);
  if (!scope.superAdmin && !scope.university) return sql`false`;
  return and(
    eq(UserSchema.id, targetUserId),
    ...(scope.university
      ? [eq(UserSchema.universityId, scope.university.id)]
      : []),
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const userId = id;

    // Get user with faculty and department info
    const userResult = await pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
        department: DepartmentSchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .leftJoin(
        DepartmentSchema,
        eq(FacultySchema.departmentId, DepartmentSchema.id),
      )
      .where(await userTenantFilter(sessionOrError.user.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const { user, faculty, department } = userResult[0];

    // Real academic aggregates — replaces the old hardcoded gpa/credits
    // placeholders. GPA stays null until graded enrollments exist.
    let gpa: number | null = null;
    let creditsCompleted = 0;
    let coursesTeaching = 0;
    if (user.role === "student") {
      const [stats] = await pgDb
        .select({
          gpa: sql<string | null>`avg(${StudentEnrollmentSchema.gradePoints})`,
          creditsCompleted: sql<number>`coalesce(sum(${CourseSchema.credits}) filter (where ${StudentEnrollmentSchema.status} = 'completed'), 0)`,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(
          CourseSchema,
          eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
        )
        .where(eq(StudentEnrollmentSchema.studentId, user.id));
      gpa = stats?.gpa != null ? Number(Number(stats.gpa).toFixed(2)) : null;
      creditsCompleted = Number(stats?.creditsCompleted ?? 0);
    } else if (faculty) {
      const [teaching] = await pgDb
        .select({
          count: sql<number>`count(distinct ${CourseInstructorSchema.courseId})`,
        })
        .from(CourseInstructorSchema)
        .where(eq(CourseInstructorSchema.facultyId, faculty.id));
      coursesTeaching = Number(teaching?.count ?? 0);
    }

    // Transform data
    const transformedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.enrollmentStatus || "active",
      department: department?.name || "Not assigned",
      studentId: user.studentId,
      level: user.year,
      joinDate: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
      phone: faculty?.contactPhone || null,
      gpa,
      creditsCompleted,
      employeeId: faculty?.employeeId || null,
      position: faculty?.position || null,
      officeLocation: faculty?.officeLocation || null,
      coursesTeaching,
    };

    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const userId = id;
    const body = await request.json();
    const {
      name,
      email,
      role,
      status,
      studentId,
      major,
      year,
      currentSemester,
      enrollmentStatus,
      isVerified,
    } = body;

    // Check if user exists — tenant-scoped (prevents cross-university IDOR)
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(await userTenantFilter(sessionOrError.user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Admins may only assign non-privileged roles — no escalation via this route
    if (role !== undefined && !["student", "faculty"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 },
      );
    }

    // Update user
    // Build the update payload — only include fields that were sent
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (role === "student") {
      if (studentId !== undefined) updateData.studentId = studentId;
      if (major !== undefined) updateData.major = major;
      if (year !== undefined) updateData.year = year;
      if (currentSemester !== undefined)
        updateData.currentSemester = currentSemester;
    }
    if (enrollmentStatus !== undefined || status !== undefined) {
      updateData.enrollmentStatus = enrollmentStatus || status;
    }
    if (typeof isVerified === "boolean") updateData.isVerified = isVerified;

    const updatedUser = await pgDb
      .update(UserSchema)
      .set(updateData)
      .where(eq(UserSchema.id, userId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const userId = id;

    // Check if user exists — tenant-scoped (prevents cross-university IDOR)
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(await userTenantFilter(sessionOrError.user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Prevent deleting admin users
    if (existingUser[0].role === "admin") {
      return NextResponse.json(
        { success: false, message: "Cannot delete admin users" },
        { status: 400 },
      );
    }

    // Delete user (cascading deletes will handle related records)
    await pgDb.delete(UserSchema).where(eq(UserSchema.id, userId));

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user",
      },
      { status: 500 },
    );
  }
}

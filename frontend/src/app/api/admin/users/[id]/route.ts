import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      .leftJoin(DepartmentSchema, eq(FacultySchema.departmentId, DepartmentSchema.id))
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const { user, faculty, department } = userResult[0];

    // Transform data
    const transformedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.enrollmentStatus || 'active',
      department: department?.name || 'Not assigned',
      studentId: user.studentId,
      level: user.year,
      joinDate: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
      phone: faculty?.contactPhone || null,
      gpa: 3.2, // Placeholder
      creditsCompleted: 0, // Placeholder
      employeeId: faculty?.employeeId || null,
      position: faculty?.position || null,
      officeLocation: faculty?.officeLocation || null,
      coursesTeaching: 0, // Placeholder
      permissions: user.role === 'admin' ? ['user_management', 'system_admin'] : [],
    };

    return NextResponse.json({
      success: true,
      data: transformedUser
    });

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch user" 
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

    // Check if user exists
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update user
    // Build the update payload — only include fields that were sent
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (role === 'student') {
      if (studentId !== undefined) updateData.studentId = studentId;
      if (major !== undefined) updateData.major = major;
      if (year !== undefined) updateData.year = year;
      if (currentSemester !== undefined) updateData.currentSemester = currentSemester;
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
      data: updatedUser[0]
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update user" 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const userId = id;

    // Check if user exists
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting admin users
    if (existingUser[0].role === 'admin') {
      return NextResponse.json(
        { success: false, message: "Cannot delete admin users" },
        { status: 400 }
      );
    }

    // Delete user (cascading deletes will handle related records)
    await pgDb
      .delete(UserSchema)
      .where(eq(UserSchema.id, userId));

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete user" 
      },
      { status: 500 }
    );
  }
}
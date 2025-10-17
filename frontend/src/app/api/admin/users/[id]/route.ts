import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
      enrollmentStatus 
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
    const updatedUser = await pgDb
      .update(UserSchema)
      .set({
        name,
        email,
        role,
        studentId: role === 'student' ? studentId : null,
        major: role === 'student' ? major : null,
        year: role === 'student' ? year : null,
        currentSemester: role === 'student' ? currentSemester : null,
        enrollmentStatus: enrollmentStatus || status,
        updatedAt: new Date(),
      })
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
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
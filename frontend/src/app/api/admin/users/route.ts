import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql, desc, ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build base query
    let query = pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
        department: DepartmentSchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .leftJoin(DepartmentSchema, eq(FacultySchema.departmentId, DepartmentSchema.id))
      .orderBy(desc(UserSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(UserSchema.name, `%${search}%`),
          ilike(UserSchema.email, `%${search}%`),
          ilike(UserSchema.studentId, `%${search}%`)
        )
      );
    }

    if (role && role !== 'all') {
      conditions.push(eq(UserSchema.role, role));
    }

    if (status && status !== 'all') {
      conditions.push(eq(UserSchema.enrollmentStatus, status));
    }

    if (department && department !== 'all') {
      conditions.push(eq(FacultySchema.departmentId, department));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const users = await query;

    // Transform data to match the frontend interface
    const transformedUsers = users.map(({ user, faculty, department }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.enrollmentStatus || 'active',
      department: department?.name || 'Not assigned',
      studentId: user.studentId,
      level: user.year,
      joinDate: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(), // Placeholder - would need session tracking
      phone: faculty?.contactPhone || null,
      gpa: 3.2, // Placeholder - would calculate from actual grades
      creditsCompleted: 0, // Placeholder - would calculate from enrollments
      employeeId: faculty?.employeeId || null,
      position: faculty?.position || null,
      officeLocation: faculty?.officeLocation || null,
      coursesTeaching: 0, // Placeholder - would count from course assignments
      permissions: user.role === 'admin' ? ['user_management', 'system_admin'] : [],
    }));

    // Get total count for pagination
    const totalCountResult = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .leftJoin(DepartmentSchema, eq(FacultySchema.departmentId, DepartmentSchema.id));

    const totalCount = totalCountResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch users" 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, role, password, studentId, major, year, currentSemester } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = await pgDb
      .insert(UserSchema)
      .values({
        name,
        email,
        role,
        password, // Note: Should be hashed in production
        studentId: role === 'student' ? studentId : null,
        major: role === 'student' ? major : null,
        year: role === 'student' ? year : null,
        currentSemester: role === 'student' ? currentSemester : null,
        enrollmentStatus: 'active',
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      data: newUser[0]
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create user" 
      },
      { status: 500 }
    );
  }
}
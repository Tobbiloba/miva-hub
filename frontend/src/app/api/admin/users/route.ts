import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  DepartmentSchema,
  FacultySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { type SQL, and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    // Tenant scope: admins only see users from their own university
    const university = await getUserUniversity(sessionOrError.user.id);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build base query
    let query = pgDb
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
      .orderBy(desc(UserSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions: (SQL<unknown> | undefined)[] = [];

    if (university) {
      conditions.push(eq(UserSchema.universityId, university.id));
    }

    if (search) {
      conditions.push(
        or(
          ilike(UserSchema.name, `%${search}%`),
          ilike(UserSchema.email, `%${search}%`),
          ilike(UserSchema.studentId, `%${search}%`),
        ),
      );
    }

    if (role && role !== "all") {
      conditions.push(eq(UserSchema.role, role));
    }

    if (status && status !== "all") {
      conditions.push(eq(UserSchema.enrollmentStatus, status));
    }

    if (department && department !== "all") {
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
      status: user.enrollmentStatus || "active",
      isVerified: user.isVerified,
      department: department?.name || "Not assigned",
      studentId: user.studentId,
      level: user.year,
      joinDate: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
      phone: faculty?.contactPhone || null,
      gpa: 3.2,
      creditsCompleted: 0,
      employeeId: faculty?.employeeId || null,
      position: faculty?.position || null,
      officeLocation: faculty?.officeLocation || null,
      coursesTeaching: 0,
      permissions:
        user.role === "admin" ? ["user_management", "system_admin"] : [],
    }));

    // Get total count for pagination
    const totalCountBase = pgDb
      .select({ count: sql<number>`count(*)` })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .leftJoin(
        DepartmentSchema,
        eq(FacultySchema.departmentId, DepartmentSchema.id),
      );

    const totalCountResult =
      conditions.length > 0
        ? await totalCountBase.where(and(...conditions))
        : await totalCountBase;

    const totalCount = totalCountResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const {
      name,
      email,
      role,
      password,
      studentId,
      major,
      year,
      currentSemester,
    } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, and role are required" },
        { status: 400 },
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
        { status: 400 },
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
        studentId: role === "student" ? studentId : null,
        major: role === "student" ? major : null,
        year: role === "student" ? year : null,
        currentSemester: role === "student" ? currentSemester : null,
        enrollmentStatus: "active",
        emailVerified: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      data: newUser[0],
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create user",
      },
      { status: 500 },
    );
  }
}

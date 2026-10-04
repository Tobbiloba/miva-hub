import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { createCredentialUser } from "@/lib/auth/provision-user";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  DepartmentSchema,
  FacultySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getAdminScope } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for faculty creation
const createFacultySchema = z.object({
  name: z.string().min(1, "Faculty name is required").max(100, "Name too long"),
  // Domain is validated per-tenant in the handler (admin's university)
  email: z.string().email("Invalid email format"),
  position: z.enum([
    "professor",
    "associate_professor",
    "assistant_professor",
    "lecturer",
    "instructor",
    "visiting_professor",
  ]),
  departmentId: z.string().uuid("Invalid department ID"),
  office: z.string().optional(),
  officeHours: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
  researchInterests: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Get query parameters for filtering/searching
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const departmentId = searchParams.get("departmentId");
    const isActive = searchParams.get("isActive");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Tenant scope: super_admin is unscoped by role; a university admin
    // without a university is misconfigured and gets 403, never unfiltered
    const scope = await getAdminScope(adminAccess.user.id);
    if (!scope.superAdmin && !scope.university) {
      return NextResponse.json(
        { success: false, error: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }
    const university = scope.university;

    // Fetch faculty with user data
    const facultyQuery = pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .where(
        university
          ? and(
              eq(UserSchema.role, "faculty"),
              eq(UserSchema.universityId, university.id),
            )
          : eq(UserSchema.role, "faculty"),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(UserSchema.createdAt);

    const facultyData = await facultyQuery;

    // Apply client-side filtering if needed
    let filteredFaculty = facultyData;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredFaculty = facultyData.filter(
        (item) =>
          item.user.name.toLowerCase().includes(searchLower) ||
          item.user.email.toLowerCase().includes(searchLower) ||
          (item.faculty?.position || "").toLowerCase().includes(searchLower),
      );
    }

    if (departmentId && departmentId !== "all") {
      filteredFaculty = filteredFaculty.filter(
        (item) => item.faculty?.departmentId === departmentId,
      );
    }

    if (isActive !== null && isActive !== undefined) {
      const activeFilter = isActive === "true";
      filteredFaculty = filteredFaculty.filter(
        (item) => item.faculty?.isActive === activeFilter,
      );
    }

    // Format response data
    const formattedFaculty = filteredFaculty.map((item) => ({
      ...item.user,
      faculty: item.faculty
        ? {
            id: item.faculty.id,
            position: item.faculty.position,
            departmentId: item.faculty.departmentId,
            office: item.faculty.officeLocation,
            officeHours: item.faculty.officeHours,
            bio: item.faculty.bio,
            qualifications: item.faculty.qualifications,
            researchInterests: item.faculty.researchInterests,
            isActive: item.faculty.isActive,
          }
        : null,
      // Remove password from response
      password: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: formattedFaculty,
      total: formattedFaculty.length,
      hasMore: facultyData.length === limit,
    });
  } catch (error) {
    console.error("[Faculty API] GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch faculty",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createFacultySchema.parse(body);

    // Tenant check: email must be on the admin's university domain list
    const { emailMatchesUniversity, getUserUniversity } = await import(
      "@/lib/tenant"
    );
    const adminUniversity = await getUserUniversity(adminAccess.user.id);
    if (!adminUniversity) {
      return NextResponse.json(
        {
          success: false,
          error: "No university associated with your admin account",
        },
        { status: 403 },
      );
    }
    if (!emailMatchesUniversity(validatedData.email, adminUniversity)) {
      return NextResponse.json(
        {
          success: false,
          error: `Email must use one of your university's domains: ${adminUniversity.emailDomains.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // The department must belong to the admin's university
    const [department] = await pgDb
      .select({ id: DepartmentSchema.id })
      .from(DepartmentSchema)
      .where(
        and(
          eq(DepartmentSchema.id, validatedData.departmentId),
          eq(DepartmentSchema.universityId, adminUniversity.id),
        ),
      )
      .limit(1);
    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 },
      );
    }

    // Check for duplicate email
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, validatedData.email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already exists",
          message: `A user with email "${validatedData.email}" already exists`,
        },
        { status: 400 },
      );
    }

    // Temporary password (faculty should change it on first login).
    // Created through better-auth: its hasher + credential account row (what
    // sign-in verifies) and the tenant/role policy hook. Pre-verified: the
    // domain was checked above and no verification-email flow exists here.
    const tempPassword = generateTempPassword();
    const createdUser = await createCredentialUser({
      email: validatedData.email,
      name: validatedData.name,
      password: tempPassword,
      assignment: { universityId: adminUniversity.id, role: "faculty" },
      emailVerified: true,
    });
    const newUser = [createdUser];

    // Create faculty profile. employee ID generated (editable later);
    // matches the invite-onboarding path's format.
    const employeeId = `FAC-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
    let newFaculty: (typeof FacultySchema.$inferSelect)[];
    try {
      newFaculty = await pgDb
        .insert(FacultySchema)
        .values({
          userId: createdUser.id,
          employeeId,
          position: validatedData.position,
          departmentId: department.id,
          officeLocation: validatedData.office || null,
          officeHours: validatedData.officeHours || null,
          bio: validatedData.bio || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    } catch (error) {
      // Don't leave a faculty-role login without its faculty record
      await pgDb
        .delete(UserSchema)
        .where(eq(UserSchema.id, createdUser.id))
        .catch(() => {});
      throw error;
    }

    // Combine user and faculty data for response
    const { password: _, ...userData } = newUser[0];
    const responseData = {
      ...userData,
      faculty: newFaculty[0],
      tempPassword, // Include temporary password for admin to share with faculty
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: `Faculty member "${validatedData.name}" created successfully`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Faculty API] POST Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create faculty member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";

// Validation schema for faculty creation
const createFacultySchema = z.object({
  name: z.string().min(1, "Faculty name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").refine(
    (email) => email.endsWith('@miva.edu.ng'),
    "Email must be a valid MIVA University email (@miva.edu.ng)"
  ),
  position: z.string().min(1, "Position is required").max(50, "Position too long"),
  departmentId: z.string().uuid("Invalid department ID"),
  office: z.string().optional(),
  officeHours: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
  researchInterests: z.array(z.string()).optional(),
});

// Validation schema for faculty updates
const updateFacultySchema = createFacultySchema.partial().omit({ email: true });

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Get query parameters for filtering/searching
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const departmentId = searchParams.get('departmentId');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch faculty with user data
    const facultyQuery = pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .where(eq(UserSchema.role, 'faculty'))
      .limit(limit)
      .offset(offset)
      .orderBy(UserSchema.createdAt);

    const facultyData = await facultyQuery;

    // Apply client-side filtering if needed
    let filteredFaculty = facultyData;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFaculty = facultyData.filter(item => 
        item.user.name.toLowerCase().includes(searchLower) ||
        item.user.email.toLowerCase().includes(searchLower) ||
        (item.faculty?.position || '').toLowerCase().includes(searchLower)
      );
    }

    if (departmentId && departmentId !== 'all') {
      filteredFaculty = filteredFaculty.filter(item => 
        item.faculty?.departmentId === departmentId
      );
    }

    if (isActive !== null && isActive !== undefined) {
      const activeFilter = isActive === 'true';
      filteredFaculty = filteredFaculty.filter(item => 
        item.faculty?.isActive === activeFilter
      );
    }

    // Format response data
    const formattedFaculty = filteredFaculty.map(item => ({
      ...item.user,
      faculty: item.faculty ? {
        id: item.faculty.id,
        position: item.faculty.position,
        departmentId: item.faculty.departmentId,
        office: item.faculty.office,
        officeHours: item.faculty.officeHours,
        bio: item.faculty.bio,
        qualifications: item.faculty.qualifications,
        researchInterests: item.faculty.researchInterests,
        isActive: item.faculty.isActive,
      } : null,
      // Remove password from response
      password: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: formattedFaculty,
      total: formattedFaculty.length,
      hasMore: facultyData.length === limit
    });

  } catch (error) {
    console.error('[Faculty API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch faculty',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    // Check for duplicate email
    const existingUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Email already exists',
        message: `A user with email "${validatedData.email}" already exists`
      }, { status: 400 });
    }

    // Generate a temporary password (faculty should change this on first login)
    const tempPassword = `faculty${Math.random().toString(36).slice(-8)}`;
    const hashedPassword = await hash(tempPassword, 12);

    // Create the faculty user
    const userId = crypto.randomUUID();
    const newUser = await pgDb
      .insert(UserSchema)
      .values({
        id: userId,
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: 'faculty',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create faculty profile
    const newFaculty = await pgDb
      .insert(FacultySchema)
      .values({
        id: crypto.randomUUID(),
        userId: userId,
        position: validatedData.position,
        departmentId: validatedData.departmentId,
        office: validatedData.office || null,
        officeHours: validatedData.officeHours || null,
        bio: validatedData.bio || null,
        qualifications: validatedData.qualifications || [],
        researchInterests: validatedData.researchInterests || [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Combine user and faculty data for response
    const { password: _, ...userData } = newUser[0];
    const responseData = {
      ...userData,
      faculty: newFaculty[0],
      tempPassword // Include temporary password for admin to share with faculty
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Faculty member "${validatedData.name}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('[Faculty API] POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create faculty member',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
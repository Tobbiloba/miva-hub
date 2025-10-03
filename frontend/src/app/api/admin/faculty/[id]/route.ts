import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema, CourseSchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

// Validation schema for faculty updates
const updateFacultySchema = z.object({
  name: z.string().min(1, "Faculty name is required").max(100, "Name too long").optional(),
  position: z.string().min(1, "Position is required").max(50, "Position too long").optional(),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  office: z.string().optional(),
  officeHours: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
  researchInterests: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    // Fetch faculty by user ID
    const facultyData = await pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'faculty')
      ))
      .limit(1);

    if (facultyData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Faculty member not found'
      }, { status: 404 });
    }

    const { user, faculty } = facultyData[0];

    // Get faculty's courses
    const courses = faculty ? await pgDb
      .select()
      .from(CourseSchema)
      .where(eq(CourseSchema.instructorId, faculty.id)) : [];

    // Remove password from response
    const { password: _, ...userData } = user;

    const facultyWithDetails = {
      ...userData,
      faculty: faculty ? {
        id: faculty.id,
        position: faculty.position,
        departmentId: faculty.departmentId,
        office: faculty.office,
        officeHours: faculty.officeHours,
        bio: faculty.bio,
        qualifications: faculty.qualifications,
        researchInterests: faculty.researchInterests,
        isActive: faculty.isActive,
        createdAt: faculty.createdAt,
        updatedAt: faculty.updatedAt
      } : null,
      courses: courses.map(course => ({
        id: course.id,
        courseCode: course.courseCode,
        title: course.title,
        credits: course.credits,
        semester: course.semester,
        year: course.year,
        isActive: course.isActive
      })),
      statistics: {
        totalCourses: courses.length,
        activeCourses: courses.filter(c => c.isActive).length,
        currentSemesterCourses: courses.filter(c => 
          c.isActive && c.semester === 'fall' && c.year === new Date().getFullYear()
        ).length
      }
    };

    return NextResponse.json({
      success: true,
      data: facultyWithDetails
    });

  } catch (error) {
    console.error('[Faculty API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch faculty member',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateFacultySchema.parse(body);

    // Check if faculty exists
    const existingFaculty = await pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'faculty')
      ))
      .limit(1);

    if (existingFaculty.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Faculty member not found'
      }, { status: 404 });
    }

    const { user, faculty } = existingFaculty[0];

    // Separate user updates from faculty updates
    const userUpdates: any = {};
    const facultyUpdates: any = {};

    // User table updates
    if (validatedData.name !== undefined) userUpdates.name = validatedData.name;
    if (validatedData.isEmailVerified !== undefined) userUpdates.isEmailVerified = validatedData.isEmailVerified;

    // Faculty table updates
    if (validatedData.position !== undefined) facultyUpdates.position = validatedData.position;
    if (validatedData.departmentId !== undefined) facultyUpdates.departmentId = validatedData.departmentId;
    if (validatedData.office !== undefined) facultyUpdates.office = validatedData.office;
    if (validatedData.officeHours !== undefined) facultyUpdates.officeHours = validatedData.officeHours;
    if (validatedData.bio !== undefined) facultyUpdates.bio = validatedData.bio;
    if (validatedData.qualifications !== undefined) facultyUpdates.qualifications = validatedData.qualifications;
    if (validatedData.researchInterests !== undefined) facultyUpdates.researchInterests = validatedData.researchInterests;
    if (validatedData.isActive !== undefined) facultyUpdates.isActive = validatedData.isActive;

    // Update user record if there are user updates
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      const updatedUsers = await pgDb
        .update(UserSchema)
        .set({
          ...userUpdates,
          updatedAt: new Date()
        })
        .where(eq(UserSchema.id, id))
        .returning();
      updatedUser = updatedUsers[0];
    }

    // Update faculty record if there are faculty updates and faculty profile exists
    let updatedFaculty = faculty;
    if (faculty && Object.keys(facultyUpdates).length > 0) {
      const updatedFacultyRecords = await pgDb
        .update(FacultySchema)
        .set({
          ...facultyUpdates,
          updatedAt: new Date()
        })
        .where(eq(FacultySchema.userId, id))
        .returning();
      updatedFaculty = updatedFacultyRecords[0];
    }

    // Remove password from response
    const { password: _, ...userData } = updatedUser;

    const responseData = {
      ...userData,
      faculty: updatedFaculty ? {
        id: updatedFaculty.id,
        position: updatedFaculty.position,
        departmentId: updatedFaculty.departmentId,
        office: updatedFaculty.office,
        officeHours: updatedFaculty.officeHours,
        bio: updatedFaculty.bio,
        qualifications: updatedFaculty.qualifications,
        researchInterests: updatedFaculty.researchInterests,
        isActive: updatedFaculty.isActive,
      } : null
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Faculty member "${userData.name}" updated successfully`
    });

  } catch (error) {
    console.error('[Faculty API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update faculty member',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    // Check if faculty exists
    const existingFaculty = await pgDb
      .select({
        user: UserSchema,
        faculty: FacultySchema,
      })
      .from(UserSchema)
      .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'faculty')
      ))
      .limit(1);

    if (existingFaculty.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Faculty member not found'
      }, { status: 404 });
    }

    const { user, faculty } = existingFaculty[0];

    // Check for active courses before deletion
    const activeCourses = faculty ? await pgDb
      .select()
      .from(CourseSchema)
      .where(and(
        eq(CourseSchema.instructorId, faculty.id),
        eq(CourseSchema.isActive, true)
      )) : [];

    if (activeCourses.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete faculty with active courses',
        message: `Faculty member has ${activeCourses.length} active courses. Please reassign them first.`,
        dependencies: {
          activeCourses: activeCourses.length
        }
      }, { status: 400 });
    }

    // Soft delete by deactivating faculty profile instead of hard delete
    if (faculty) {
      await pgDb
        .update(FacultySchema)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(FacultySchema.userId, id));
    }

    // Deactivate user account
    await pgDb
      .update(UserSchema)
      .set({
        isEmailVerified: false,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, id));

    return NextResponse.json({
      success: true,
      message: `Faculty member "${user.name}" deactivated successfully`
    });

  } catch (error) {
    console.error('[Faculty API] DELETE Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete faculty member',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
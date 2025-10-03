import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq } from "drizzle-orm";

// Validation schemas for different profile categories
const personalProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
});

const academicProfileSchema = z.object({
  academicYear: z.enum(["100", "200", "300", "400"]).optional(),
  department: z.string().optional(),
  officeHours: z.string().optional(),
});

const settingsProfileSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  profileVisibility: z.enum(["public", "university", "private"]).optional(),
  twoFactorEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile data
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get faculty data if user is faculty
    let facultyData = null;
    if ((user[0] as any).role === 'faculty') {
      const faculty = await pgDb
        .select()
        .from(FacultySchema)
        .where(eq(FacultySchema.userId, session.user.id))
        .limit(1);
      
      facultyData = faculty.length > 0 ? faculty[0] : null;
    }

    // Remove sensitive information
    const { password: _, ...userProfile } = user[0];
    
    const profileData = {
      ...userProfile,
      faculty: facultyData,
    };

    return NextResponse.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('[Profile API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { category, data } = body;

    if (!category || !data) {
      return NextResponse.json(
        { success: false, error: "Category and data are required" },
        { status: 400 }
      );
    }

    let validatedData: any;
    let updateUserFields: any = {};
    let updateFacultyFields: any = {};

    // Validate data based on category
    switch (category) {
      case 'personal':
        validatedData = personalProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
          ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
          ...(validatedData.dateOfBirth !== undefined && { dateOfBirth: validatedData.dateOfBirth }),
          ...(validatedData.address !== undefined && { address: validatedData.address }),
        };
        break;

      case 'academic':
        validatedData = academicProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.academicYear && { academicYear: validatedData.academicYear }),
          ...(validatedData.department !== undefined && { department: validatedData.department }),
        };
        updateFacultyFields = {
          ...(validatedData.officeHours !== undefined && { officeHours: validatedData.officeHours }),
        };
        break;

      case 'settings':
        validatedData = settingsProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.emailNotifications !== undefined && { emailNotifications: validatedData.emailNotifications }),
          ...(validatedData.pushNotifications !== undefined && { pushNotifications: validatedData.pushNotifications }),
          ...(validatedData.marketingEmails !== undefined && { marketingEmails: validatedData.marketingEmails }),
          ...(validatedData.profileVisibility && { profileVisibility: validatedData.profileVisibility }),
          ...(validatedData.twoFactorEnabled !== undefined && { twoFactorEnabled: validatedData.twoFactorEnabled }),
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid category" },
          { status: 400 }
        );
    }

    // Update user record if there are fields to update
    if (Object.keys(updateUserFields).length > 0) {
      await pgDb
        .update(UserSchema)
        .set({
          ...updateUserFields,
          updatedAt: new Date()
        })
        .where(eq(UserSchema.id, session.user.id));
    }

    // Update faculty record if there are faculty fields to update
    if (Object.keys(updateFacultyFields).length > 0) {
      // Check if faculty record exists
      const existingFaculty = await pgDb
        .select()
        .from(FacultySchema)
        .where(eq(FacultySchema.userId, session.user.id))
        .limit(1);

      if (existingFaculty.length > 0) {
        await pgDb
          .update(FacultySchema)
          .set({
            ...updateFacultyFields,
            updatedAt: new Date()
          })
          .where(eq(FacultySchema.userId, session.user.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error('[Profile API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
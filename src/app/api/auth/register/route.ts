import { NextRequest, NextResponse } from "next/server";
import { validateSchoolEmail, prepareUserRegistrationData } from "lib/utils/email-validation";
import { auth } from "lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    // Validate school email BEFORE attempting registration
    const emailValidation = validateSchoolEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { 
          error: emailValidation.error,
          code: "INVALID_SCHOOL_EMAIL" 
        },
        { status: 400 }
      );
    }

    // Prepare user data with academic fields
    const userData = prepareUserRegistrationData({ email, name, password });

    // Call Better Auth's sign-up API
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        name: userData.name,
        password: password, // Use original password directly to ensure it's defined
      },
      headers: request.headers,
    });

    // If sign-up was successful, update user with academic fields
    if (signUpResponse && signUpResponse.user) {
      const { pgDb } = await import("lib/db/pg/db.pg");
      const { UserSchema } = await import("lib/db/pg/schema.pg");
      const { eq } = await import("drizzle-orm");

      await pgDb
        .update(UserSchema)
        .set({
          studentId: userData.studentId,
          role: userData.role,
          academicYear: userData.academicYear,
          enrollmentStatus: userData.enrollmentStatus,
        })
        .where(eq(UserSchema.id, signUpResponse.user.id));

      console.log(`User ${signUpResponse.user.id} registered with academic fields:`, {
        role: userData.role,
        academicYear: userData.academicYear,
        studentId: userData.studentId,
      });
    }

    return NextResponse.json(signUpResponse);

  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle known Better Auth errors
    if (error.message?.includes("User already exists")) {
      return NextResponse.json(
        { error: "A user with this email already exists", code: "USER_EXISTS" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
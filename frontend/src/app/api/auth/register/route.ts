import { NextRequest, NextResponse } from "next/server";
import { validateSchoolEmail, prepareUserRegistrationData } from "lib/utils/email-validation";
import { auth } from "lib/auth/server";
import { sendEmail } from "@/lib/email/smtp-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, studentId, major, year, semester, selectedCourses } = body;

    // Validate required fields
    if (!email || !name || !password || !studentId || !major || !year || !semester) {
      return NextResponse.json(
        { error: "All basic and academic information fields are required" },
        { status: 400 }
      );
    }

    // Validate courses selection
    if (!selectedCourses || !Array.isArray(selectedCourses) || selectedCourses.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one course" },
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

    // Prepare user data with academic fields (but override studentId with form input)
    const userData = prepareUserRegistrationData({ email, name, password });
    userData.studentId = studentId; // Use the studentId from form input

    // Call Better Auth's sign-up API
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        name: userData.name,
        password: password, // Use original password directly to ensure it's defined
      },
      headers: request.headers,
    });

    // If sign-up was successful, update user with academic fields and create enrollments
    if (signUpResponse && signUpResponse.user) {
      const { pgDb } = await import("lib/db/pg/db.pg");
      const { 
        UserSchema, 
        StudentEnrollmentSchema
      } = await import("lib/db/pg/schema.pg");
      const { pgAcademicRepository } = await import("@/lib/db/pg/repositories/academic-repository.pg");
      const { eq } = await import("drizzle-orm");

      try {
        // Get the active academic calendar for enrollment context
        const activeCalendar = await pgAcademicRepository.getActiveAcademicCalendar();
        
        // Find the department that matches the selected major
        const department = await pgAcademicRepository.getDepartmentByCode(major.toUpperCase());
        
        // Update user with academic fields
        await pgDb
          .update(UserSchema)
          .set({
            studentId: userData.studentId,
            major: department?.name || major,
            year: year,
            currentSemester: semester,
            role: userData.role,
            academicYear: userData.academicYear,
            enrollmentStatus: userData.enrollmentStatus,
          })
          .where(eq(UserSchema.id, signUpResponse.user.id));

        // Get current semester/year if not available in calendar
        const { getCurrentSemester, getCurrentAcademicYear } = await import("@/lib/utils/semester");
        const [currentSemester, currentAcademicYear] = await Promise.all([
          getCurrentSemester(),
          getCurrentAcademicYear()
        ]);

        // Create student enrollments for selected courses
        const enrollments = selectedCourses.map((courseId: string) => ({
          studentId: signUpResponse.user.id,
          courseId: courseId,
          semester: activeCalendar?.semester || currentSemester,
          academicYear: activeCalendar?.academicYear || currentAcademicYear,
          status: "enrolled" as const,
        }));

        await pgDb.insert(StudentEnrollmentSchema).values(enrollments);

        console.log(`User ${signUpResponse.user.id} registered with:`, {
          role: userData.role,
          academicYear: userData.academicYear,
          studentId: userData.studentId,
          major: department?.name || major,
          year: year,
          semester: semester,
          enrolledCourses: selectedCourses.length,
        });

      } catch (enrollmentError) {
        console.error("Error creating student enrollments:", enrollmentError);
        // Don't fail the registration if enrollment creation fails
        // The user account was created successfully
      }

      // Send welcome email
      try {
        const fs = await import("fs");
        const path = await import("path");
        const welcomeTemplate = fs.readFileSync(
          path.join(process.cwd(), "src/lib/email/templates/welcome-email.html"),
          "utf-8"
        );

        const welcomeHtml = welcomeTemplate
          .replace("{{userName}}", signUpResponse.user.name || "User")
          .replace(/{{appUrl}}/g, process.env.NEXT_PUBLIC_APP_URL || "https://miva-hub.com");

        await sendEmail({
          to: signUpResponse.user.email,
          subject: "Welcome to MIVA Hub! 🎓",
          html: welcomeHtml,
        });
        console.log(`Welcome email sent to ${signUpResponse.user.email}`);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail registration if email fails
      }
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
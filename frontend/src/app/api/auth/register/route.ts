import { NextRequest, NextResponse } from "next/server";
import { auth } from "lib/auth/server";
import { sendEmail } from "@/lib/email/smtp-service";
import { buildWelcomeEmail } from "@/lib/email/templates/welcome";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      password,
      programId,
      level,
      matricNumber,
    } = body;

    // Validate required fields
    if (!email || !name || !password || !programId || !level) {
      return NextResponse.json(
        { error: "Name, email, password, program, and level are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate matric number format if provided
    if (matricNumber && !/^MIVA\/[A-Z]{2,4}\/\d{4}\/\d{3}$/.test(matricNumber)) {
      return NextResponse.json(
        { error: "Invalid matric number format. Expected: MIVA/DEPT/YEAR/NNN" },
        { status: 400 }
      );
    }

    // Get active academic session for semester/year context
    const activeSession = await pgAcademicRepository.getActiveAcademicSession();
    if (!activeSession) {
      return NextResponse.json(
        { error: "No active academic session. Contact admin." },
        { status: 503 }
      );
    }

    const academicYear = activeSession.sessionName.replace("/", "-");
    const currentSemester = activeSession.currentSemester; // "first" | "second"

    // Build enrollment semester string: "first" + "2025/2026" → "2025-fall"
    const [startYear, endYear] = activeSession.sessionName.split("/");
    const enrollmentSemester =
      currentSemester === "first"
        ? `${startYear}-fall`
        : `${endYear}-spring`;

    // 1. Create user via Better Auth
    const signUpResponse = await auth.api.signUpEmail({
      body: { email: email.toLowerCase().trim(), name: name.trim(), password },
      headers: request.headers,
    });

    if (!signUpResponse?.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const userId = signUpResponse.user.id;

    // 2. Update user with academic fields + trial
    const { pgDb } = await import("lib/db/pg/db.pg");
    const { UserSchema } = await import("lib/db/pg/schema.pg");
    const { eq } = await import("drizzle-orm");

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await pgDb
      .update(UserSchema)
      .set({
        role: "student",
        programId,
        currentLevel: Number(level),
        currentSemester,
        academicYear,
        enrollmentStatus: "active",
        emailVerified: true,
        isVerified: false,
        studentId: matricNumber || null,
        year: String(level),
        admissionSession: activeSession.sessionName,
        admissionLevel: Number(level),
        trialStartedAt: now,
        trialEndsAt: trialEnd,
      })
      .where(eq(UserSchema.id, userId));

    // 3. Auto-enroll in compulsory courses
    let enrolledCount = 0;
    try {
      enrolledCount = await pgAcademicRepository.autoEnrollStudent(
        userId,
        programId,
        Number(level),
        currentSemester as "first" | "second",
        academicYear,
        enrollmentSemester
      );
    } catch (enrollError) {
      console.error("Auto-enrollment error (non-fatal):", enrollError);
      // Don't fail registration if enrollment fails
    }

    // 4. Send welcome email (best-effort)
    try {
      const firstName = name.trim().split(" ")[0];
      const { subject, html, text } = buildWelcomeEmail({
        firstName,
        courseCount: enrolledCount,
        semester: currentSemester,
        academicYear,
      });

      await sendEmail({ to: email, subject, html, text });
    } catch (emailError) {
      console.error("Welcome email error (non-fatal):", emailError);
    }

    console.log(`Self-service signup complete:`, {
      userId,
      email,
      programId,
      level,
      semester: currentSemester,
      academicYear,
      enrolledCourses: enrolledCount,
    });

    return NextResponse.json({
      ...signUpResponse,
      enrolledCourses: enrolledCount,
      academicYear,
      semester: currentSemester,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error.message?.includes("User already exists")) {
      return NextResponse.json(
        { error: "An account with this email already exists", code: "USER_EXISTS" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

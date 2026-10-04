import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { sendEmail } from "@/lib/email/smtp-service";
import { buildWelcomeEmail } from "@/lib/email/templates/welcome";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { auth } from "lib/auth/server";
import { withSignupAssignment } from "lib/auth/signup-context";
import { UNKNOWN_EMAIL_DOMAIN_MESSAGE } from "lib/auth/signup-policy";
import { pgDb } from "lib/db/pg/db.pg";
import { ProgramSchema, UserSchema } from "lib/db/pg/schema.pg";
import { resolveUniversityFromEmail } from "lib/tenant";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
      termsAccepted,
    } = body;

    // Validate required fields
    if (!email || !name || !password || !programId || !level) {
      return NextResponse.json(
        { error: "Name, email, password, program, and level are required" },
        { status: 400 },
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must agree to the Terms of Service and Privacy Policy" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Validate matric number format if provided (loose check — formats
    // vary per university, e.g. MIVA/CS/2024/001)
    if (matricNumber && !/^[A-Za-z0-9/\-_.]{3,40}$/.test(matricNumber)) {
      return NextResponse.json(
        { error: "Invalid matric number format" },
        { status: 400 },
      );
    }

    const ip = getClientIp(request);
    const limit = await checkRateLimit(`register:${ip}`, 5, 15 * 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    // Fast, friendly domain check + program tenancy. The better-auth
    // user-create hook re-applies the domain gate when the row is inserted.
    const university = await resolveUniversityFromEmail(email);
    if (!university) {
      return NextResponse.json(
        { error: UNKNOWN_EMAIL_DOMAIN_MESSAGE, code: "UNKNOWN_EMAIL_DOMAIN" },
        { status: 403 },
      );
    }

    // The program must belong to the student's own university
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const [program] = UUID_RE.test(String(programId))
      ? await pgDb
          .select({ id: ProgramSchema.id })
          .from(ProgramSchema)
          .where(
            and(
              eq(ProgramSchema.id, programId),
              eq(ProgramSchema.universityId, university.id),
              eq(ProgramSchema.isActive, true),
            ),
          )
          .limit(1)
      : [];
    if (!program) {
      return NextResponse.json(
        { error: "Selected program is not offered by your university" },
        { status: 400 },
      );
    }

    // Get active academic session for semester/year context
    const activeSession = await pgAcademicRepository.getActiveAcademicSession();
    if (!activeSession) {
      return NextResponse.json(
        { error: "No active academic session. Contact admin." },
        { status: 503 },
      );
    }

    const academicYear = activeSession.sessionName.replace("/", "-");
    const currentSemester = activeSession.currentSemester; // "first" | "second"

    // Build enrollment semester string: "first" + "2025/2026" → "2025-fall"
    const [startYear, endYear] = activeSession.sessionName.split("/");
    const enrollmentSemester =
      currentSemester === "first" ? `${startYear}-fall` : `${endYear}-spring`;

    // 1. Create user via Better Auth. Its user-create hook is the tenant
    // gate: it resolves the university from the email domain (rejecting
    // unregistered domains) and assigns role, tenant and trial in the INSERT.
    const signUpResponse = await withSignupAssignment({ role: "student" }, () =>
      auth.api.signUpEmail({
        body: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password,
          callbackURL: "/student/dashboard",
        },
        headers: request.headers,
      }),
    );

    if (!signUpResponse?.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    const userId = signUpResponse.user.id;

    // 2. Fill in the academic profile (tenant/role/trial already set)
    const now = new Date();

    await pgDb
      .update(UserSchema)
      .set({
        programId,
        currentLevel: Number(level),
        currentSemester,
        academicYear,
        isVerified: false,
        studentId: matricNumber || null,
        year: String(level),
        admissionSession: activeSession.sessionName,
        admissionLevel: Number(level),
        termsAcceptedAt: now,
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
        enrollmentSemester,
      );
    } catch (enrollError) {
      console.error("Auto-enrollment error (non-fatal):", enrollError);
      // Don't fail registration if enrollment fails
    }

    // 4. Fire-and-forget starter content generation
    if (enrolledCount > 0) {
      import("@/lib/onboarding/generate-starter-content")
        .then(({ generateStarterContent }) => generateStarterContent(userId))
        .catch((e) =>
          console.warn("Starter content init error (non-fatal):", e),
        );
    }

    // 5. Send welcome email (best-effort)
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
    if (
      error instanceof APIError &&
      error.body?.code === "UNKNOWN_EMAIL_DOMAIN"
    ) {
      return NextResponse.json(
        { error: error.body.message, code: "UNKNOWN_EMAIL_DOMAIN" },
        { status: 403 },
      );
    }

    console.error("Registration error:", error);

    if (error.message?.includes("User already exists")) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          code: "USER_EXISTS",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}

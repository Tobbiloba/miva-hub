import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMISSIONS_CONFIDENCE_FLOOR,
  ADMISSIONS_MODEL,
  getAdmittableProgram,
  provisionStudentAccount,
  runAdmissionsReview,
} from "lib/ai/admissions-officer";
import { recordAIDecision } from "lib/ai/decision-ledger";
import { pgDb } from "lib/db/pg/db.pg";
import {
  AdmissionApplicationSchema,
  DepartmentSchema,
  ProgramSchema,
  UniversitySchema,
  UserSchema,
} from "lib/db/pg/schema.pg";
import { checkRateLimit } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Admissions API: " });

export const maxDuration = 120;

// Image or PDF only — same gradeable set the grading agent accepts
const DOCUMENT_MEDIA_TYPES = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
// ~6MB of base64 ≈ 4.5MB file — enough for a photographed result slip
const MAX_DOCUMENT_BASE64_CHARS = 6_000_000;

const applySchema = z.object({
  programId: z.string().uuid(),
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  previousSchool: z.string().max(200).optional(),
  transcriptText: z.string().min(20).max(8000),
  personalStatement: z.string().max(4000).optional(),
  document: z
    .object({
      name: z.string().min(1).max(200),
      mediaType: z.string().regex(DOCUMENT_MEDIA_TYPES),
      dataBase64: z.string().min(1).max(MAX_DOCUMENT_BASE64_CHARS),
    })
    .optional(),
});

/** POST /api/admissions/apply — public. The AI admissions officer processes
 * the application end-to-end; humans see only escalations. */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`admissions-apply:${ip}`, 10, 3600).allowed) {
      return NextResponse.json(
        { error: "Too many applications from this address. Try again later." },
        { status: 429 },
      );
    }

    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid application", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const email = data.email.toLowerCase().trim();

    // Tenancy derived from the program row — never from the request body
    const target = await getAdmittableProgram(data.programId);
    if (!target) {
      return NextResponse.json(
        { error: "This program is not accepting applications" },
        { status: 404 },
      );
    }
    const { program, departmentName, university } = target;

    // An existing account can't be provisioned again
    const [existingUser] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(eq(UserSchema.email, email))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists — please sign in.",
        },
        { status: 409 },
      );
    }

    // One live application per email per program (unique constraint backs this)
    const [existingApp] = await pgDb
      .select({ status: AdmissionApplicationSchema.status })
      .from(AdmissionApplicationSchema)
      .where(
        and(
          eq(AdmissionApplicationSchema.email, email),
          eq(AdmissionApplicationSchema.programId, data.programId),
        ),
      )
      .limit(1);
    if (existingApp) {
      return NextResponse.json(
        {
          error: `You already have an application for this program (status: ${existingApp.status.replace("_", " ")}).`,
        },
        { status: 409 },
      );
    }

    const [application] = await pgDb
      .insert(AdmissionApplicationSchema)
      .values({
        universityId: university.id,
        programId: program.id,
        fullName: data.fullName.trim(),
        email,
        phone: data.phone?.trim(),
        previousSchool: data.previousSchool?.trim(),
        transcriptText: data.transcriptText.trim(),
        personalStatement: data.personalStatement?.trim(),
        documentName: data.document?.name,
      })
      .returning({ id: AdmissionApplicationSchema.id });

    // ── The AI admissions officer reviews the application ──
    const startedAt = Date.now();
    const review = await runAdmissionsReview({
      applicant: {
        fullName: data.fullName,
        email,
        previousSchool: data.previousSchool,
        transcriptText: data.transcriptText,
        personalStatement: data.personalStatement,
      },
      program: {
        name: program.name,
        code: program.code,
        departmentName,
        durationYears: program.durationYears,
      },
      universityName: university.name,
      document: data.document ?? null,
    });

    // Policy gate: low confidence never executes — a human decides instead
    const escalate =
      review.decision === "escalate" ||
      review.confidence < ADMISSIONS_CONFIDENCE_FLOOR;

    let status: "admitted" | "waitlisted" | "rejected" | "escalated";
    let provisioned: Awaited<
      ReturnType<typeof provisionStudentAccount>
    > | null = null;

    if (escalate) {
      status = "escalated";
    } else if (review.decision === "admit") {
      try {
        provisioned = await provisionStudentAccount({
          fullName: data.fullName.trim(),
          email,
          universityId: university.id,
          programId: program.id,
        });
        status = "admitted";
      } catch (error) {
        // Admission stands on merit, but the account couldn't be created —
        // hand the execution step to a human rather than failing the applicant
        logger.error("provisioning failed, escalating", error);
        status = "escalated";
      }
    } else {
      status = review.decision === "waitlist" ? "waitlisted" : "rejected";
    }

    const decisionId = await recordAIDecision({
      universityId: university.id,
      decisionType: "admissions",
      actor: "admissions-agent",
      subjectType: "admission_application",
      subjectId: application.id,
      userId: provisioned?.userId ?? null,
      model: ADMISSIONS_MODEL,
      inputSummary: `${data.fullName} → ${program.code} (${program.name})${data.document ? ` + document "${data.document.name}"` : ""}`,
      decision:
        status === "escalated"
          ? `escalated (agent suggested: ${review.decision})`
          : status,
      reasoning: review.reasoning,
      confidence: review.confidence,
      status: status === "escalated" ? "pending_review" : "executed",
      metadata: {
        programCode: program.code,
        meetsCoreRequirement: review.meetsCoreRequirement,
        verifiedCredentials: review.verifiedCredentials,
        documentNotes: review.documentNotes || null,
        documentIncluded: !!data.document,
        provisionedUserId: provisioned?.userId ?? null,
        latencyMs: Date.now() - startedAt,
      },
    });

    await pgDb
      .update(AdmissionApplicationSchema)
      .set({
        status,
        aiDecision: review.decision,
        aiReasoning: review.reasoning,
        aiConfidence: review.confidence,
        verifiedCredentials: review.verifiedCredentials,
        decisionLedgerId: decisionId,
        provisionedUserId: provisioned?.userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(AdmissionApplicationSchema.id, application.id));

    return NextResponse.json({
      applicationId: application.id,
      status,
      reasoning: review.reasoning,
      verifiedCredentials: review.verifiedCredentials,
      confidence: review.confidence,
      // Present only on instant admission — shown once, never stored plaintext
      credentials: provisioned
        ? {
            email,
            studentId: provisioned.studentId,
            tempPassword: provisioned.tempPassword,
          }
        : null,
    });
  } catch (error) {
    logger.error("application failed", error);
    return NextResponse.json(
      { error: "We could not process your application. Please try again." },
      { status: 500 },
    );
  }
}

/** GET /api/admissions/apply — public list of universities + active programs
 * for the application form. */
export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`admissions-form:${ip}`, 30, 60).allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rows = await pgDb
      .select({
        programId: ProgramSchema.id,
        programName: ProgramSchema.name,
        programCode: ProgramSchema.code,
        departmentName: DepartmentSchema.name,
        universityId: UniversitySchema.id,
        universityName: UniversitySchema.name,
      })
      .from(ProgramSchema)
      .innerJoin(
        DepartmentSchema,
        eq(ProgramSchema.departmentId, DepartmentSchema.id),
      )
      .innerJoin(
        UniversitySchema,
        eq(ProgramSchema.universityId, UniversitySchema.id),
      )
      .where(
        and(
          eq(ProgramSchema.isActive, true),
          ne(UniversitySchema.status, "suspended"),
        ),
      )
      .orderBy(UniversitySchema.name, ProgramSchema.name);

    const universities = new Map<
      string,
      {
        id: string;
        name: string;
        programs: {
          id: string;
          name: string;
          code: string;
          department: string;
        }[];
      }
    >();
    for (const row of rows) {
      if (!universities.has(row.universityId)) {
        universities.set(row.universityId, {
          id: row.universityId,
          name: row.universityName,
          programs: [],
        });
      }
      universities.get(row.universityId)!.programs.push({
        id: row.programId,
        name: row.programName,
        code: row.programCode,
        department: row.departmentName,
      });
    }

    return NextResponse.json({ universities: [...universities.values()] });
  } catch (error) {
    logger.error("failed to load application form data", error);
    return NextResponse.json(
      { error: "Failed to load programs" },
      { status: 500 },
    );
  }
}

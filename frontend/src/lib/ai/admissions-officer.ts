import "server-only";

import { type UserContent, generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "auth/server";
import { customModelProvider } from "lib/ai/models";
import { pgDb } from "lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  DepartmentSchema,
  ProgramSchema,
  UniversitySchema,
  UserSchema,
} from "lib/db/pg/schema.pg";

/**
 * AI Admissions Officer.
 *
 * Humans set the admission policy below; the Gemini agent executes it:
 * it reads the applicant's academic record (text and/or an uploaded document
 * photo/PDF), verifies credentials against the policy, and decides
 * admit / waitlist / reject — escalating to a human only when unsure.
 */

// gemini-2.5-flash: multimodal (reads photographed result slips / PDF
// transcripts) and available on all API tiers — 2.5-pro has no free-tier quota.
export const ADMISSIONS_MODEL = "gemini-2.5-flash";

// Below this confidence the agent's decision is NOT executed — it escalates
// to a human admissions officer instead. This is the human-set policy gate.
export const ADMISSIONS_CONFIDENCE_FLOOR = 0.75;

/** Human-set admission policy the agent enforces. */
export const ADMISSION_POLICY = `ADMISSION POLICY (set by the university, enforced by you):
1. Minimum requirement: five (5) O'Level credit passes (grades A1–C6 in WAEC/NECO, or equivalent) obtained in not more than two sittings.
2. The five credits MUST include English Language and Mathematics.
3. The credits must include subjects relevant to the chosen program (e.g. sciences for Computer Science/Engineering, commercial subjects for Business/Accounting).
4. Grades D7/E8/F9 are passes but NOT credits — they do not count toward the five.
5. ADMIT applicants who clearly meet all requirements.
6. WAITLIST applicants who meet the core requirement (5 credits incl. English & Math) but are weak on program-relevant subjects.
7. REJECT applicants who clearly fail the core requirement.
8. ESCALATE to a human whenever: the record is illegible or ambiguous, the document looks altered or inconsistent with the typed record, grades use an unfamiliar system you cannot confidently map, or anything else prevents a confident decision.`;

export const admissionAgentSchema = z.object({
  decision: z
    .enum(["admit", "waitlist", "reject", "escalate"])
    .describe("The admission decision per the policy"),
  reasoning: z
    .string()
    .describe(
      "Plain-language explanation of the decision, citing the specific credentials and policy rules applied",
    ),
  verifiedCredentials: z
    .array(
      z.object({
        subject: z.string().describe("Subject name, e.g. 'Mathematics'"),
        grade: z.string().describe("Grade as stated, e.g. 'B3'"),
        isCredit: z
          .boolean()
          .describe("Whether this grade counts as a credit pass (A1–C6)"),
      }),
    )
    .describe("Every credential extracted from the applicant's record"),
  meetsCoreRequirement: z
    .boolean()
    .describe(
      "Whether the applicant has 5+ credits including English and Mathematics",
    ),
  documentNotes: z
    .string()
    .describe(
      "Notes on the uploaded document: legibility, consistency with the typed record, authenticity concerns. Empty string if no document was provided.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence in this decision from 0 to 1. Lower it for illegible documents, ambiguous grades, or mismatches between document and typed record.",
    ),
});

export type AdmissionAgentResult = z.infer<typeof admissionAgentSchema>;

export interface ApplicantDocument {
  name: string;
  mediaType: string;
  /** Raw base64 (no data: prefix) */
  dataBase64: string;
}

export interface AdmissionsReviewInput {
  applicant: {
    fullName: string;
    email: string;
    previousSchool?: string | null;
    transcriptText: string;
    personalStatement?: string | null;
  };
  program: {
    name: string;
    code: string;
    departmentName: string;
    durationYears: number;
  };
  universityName: string;
  document?: ApplicantDocument | null;
}

/** Run the Gemini admissions review. Throws on model failure. */
export async function runAdmissionsReview(
  input: AdmissionsReviewInput,
): Promise<AdmissionAgentResult> {
  const { applicant, program, universityName, document } = input;

  const userContent: UserContent = [
    {
      type: "text",
      text: [
        `University: ${universityName}`,
        `Program applied for: ${program.name} (${program.code}), Department of ${program.departmentName}, ${program.durationYears}-year program`,
        "",
        `Applicant: ${applicant.fullName}`,
        applicant.previousSchool
          ? `Previous school: ${applicant.previousSchool}`
          : null,
        "",
        "Academic record as typed by the applicant:",
        applicant.transcriptText,
        applicant.personalStatement
          ? `\nPersonal statement:\n${applicant.personalStatement}`
          : null,
        document
          ? `\nThe applicant's supporting document ("${document.name}") is attached — it may be a photographed result slip or a PDF transcript. Read it carefully and cross-check it against the typed record.`
          : "\nNo supporting document was uploaded. The typed record alone is acceptable evidence — do NOT lower your confidence merely because no document is attached. Confidence should reflect how certain the decision is given the record you have.",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    },
  ];

  if (document) {
    userContent.push({
      type: "file",
      data: document.dataBase64,
      mediaType: document.mediaType,
    });
  }

  const model = await customModelProvider.getModel({
    provider: "google",
    model: ADMISSIONS_MODEL,
  });

  const { object } = await generateObject({
    model,
    schema: admissionAgentSchema,
    system: [
      "You are the AI admissions officer of a university. You verify applicants' credentials and decide admissions strictly per the policy below.",
      "Never invent credentials the applicant did not present. If the document contradicts the typed record, trust neither — escalate.",
      "",
      ADMISSION_POLICY,
    ].join("\n"),
    messages: [{ role: "user", content: userContent }],
  });

  return {
    ...object,
    confidence: Math.min(Math.max(object.confidence, 0), 1),
  };
}

/**
 * Load the program with its university + department, verifying it is active
 * and the university is not suspended. universityId is DERIVED here — the
 * request body's word is never trusted for tenancy.
 */
export async function getAdmittableProgram(programId: string) {
  const [row] = await pgDb
    .select({
      program: {
        id: ProgramSchema.id,
        universityId: ProgramSchema.universityId,
        code: ProgramSchema.code,
        name: ProgramSchema.name,
        durationYears: ProgramSchema.durationYears,
      },
      departmentName: DepartmentSchema.name,
      university: {
        id: UniversitySchema.id,
        name: UniversitySchema.name,
        status: UniversitySchema.status,
      },
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
      and(eq(ProgramSchema.id, programId), eq(ProgramSchema.isActive, true)),
    )
    .limit(1);

  if (!row || row.university.status === "suspended") return null;
  return row;
}

export interface ProvisionedAccount {
  userId: string;
  studentId: string;
  tempPassword: string;
}

/**
 * Provision the admitted student's account through the better-auth adapter
 * (hash + account row — never a raw insert), then promote it to a student of
 * the university. Returns the generated credentials for one-time display.
 */
export async function provisionStudentAccount(params: {
  fullName: string;
  email: string;
  universityId: string;
  programId: string;
}): Promise<ProvisionedAccount> {
  // Temp password: 16 chars from a URL-safe alphabet, crypto-random
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const tempPassword = Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");

  const signUpResponse = await auth.api.signUpEmail({
    body: {
      email: params.email,
      name: params.fullName,
      password: tempPassword,
    },
  });
  if (!signUpResponse?.user) {
    throw new Error("Account provisioning failed");
  }
  const userId = signUpResponse.user.id;

  // Current academic session for the university (fallback: derive from date)
  const [session] = await pgDb
    .select({ sessionName: AcademicSessionSchema.sessionName })
    .from(AcademicSessionSchema)
    .where(
      and(
        eq(AcademicSessionSchema.universityId, params.universityId),
        eq(AcademicSessionSchema.isCurrent, true),
      ),
    )
    .limit(1);
  const year = new Date().getFullYear();
  const admissionSession = session?.sessionName ?? `${year}/${year + 1}`;
  const academicYear = admissionSession.replace("/", "-");

  const studentId = `STU-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;

  await pgDb
    .update(UserSchema)
    .set({
      role: "student",
      universityId: params.universityId,
      programId: params.programId,
      studentId,
      admissionSession,
      admissionLevel: 100,
      currentLevel: 100,
      academicYear,
      enrollmentStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(UserSchema.id, userId));

  return { userId, studentId, tempPassword };
}

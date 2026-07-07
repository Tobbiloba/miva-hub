import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "lib/db/pg/db.pg";
import { AdmissionApplicationSchema, ProgramSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Admin Admissions API: " });

const querySchema = z.object({
  status: z
    .enum(["under_review", "admitted", "waitlisted", "rejected", "escalated"])
    .optional(),
});

/** GET /api/admin/admissions — tenant-scoped application list. */
export async function GET(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    // Tenant scope from the session user — never from the request
    const { getUserUniversity } = await import("@/lib/tenant");
    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json({ applications: [] });
    }

    const conditions = [
      eq(AdmissionApplicationSchema.universityId, university.id),
    ];
    if (parsed.data.status) {
      conditions.push(
        eq(AdmissionApplicationSchema.status, parsed.data.status),
      );
    }

    const rows = await pgDb
      .select({
        id: AdmissionApplicationSchema.id,
        fullName: AdmissionApplicationSchema.fullName,
        email: AdmissionApplicationSchema.email,
        previousSchool: AdmissionApplicationSchema.previousSchool,
        transcriptText: AdmissionApplicationSchema.transcriptText,
        documentName: AdmissionApplicationSchema.documentName,
        status: AdmissionApplicationSchema.status,
        aiDecision: AdmissionApplicationSchema.aiDecision,
        aiReasoning: AdmissionApplicationSchema.aiReasoning,
        aiConfidence: AdmissionApplicationSchema.aiConfidence,
        verifiedCredentials: AdmissionApplicationSchema.verifiedCredentials,
        provisionedUserId: AdmissionApplicationSchema.provisionedUserId,
        reviewedAt: AdmissionApplicationSchema.reviewedAt,
        createdAt: AdmissionApplicationSchema.createdAt,
        programName: ProgramSchema.name,
        programCode: ProgramSchema.code,
      })
      .from(AdmissionApplicationSchema)
      .innerJoin(
        ProgramSchema,
        eq(AdmissionApplicationSchema.programId, ProgramSchema.id),
      )
      .where(and(...conditions))
      .orderBy(desc(AdmissionApplicationSchema.createdAt))
      .limit(200);

    return NextResponse.json({ applications: rows });
  } catch (error) {
    logger.error("failed to list applications", error);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 },
    );
  }
}

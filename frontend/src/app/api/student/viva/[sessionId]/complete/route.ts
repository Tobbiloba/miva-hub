import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { type VivaTurn, scoreVivaTranscript } from "@/lib/ai/viva";
import { getUserUniversity } from "@/lib/tenant";
import { getApiSession } from "auth/server";
import { checkPaidAccess, paymentRequiredResponse } from "@/lib/billing/access";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, VivaSessionSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Viva Complete API: " });

const bodySchema = z.object({
  transcript: z
    .array(
      z.object({
        role: z.enum(["examiner", "student"]),
        text: z.string().max(10_000),
      }),
    )
    .max(400),
  abandoned: z.boolean().optional(),
});

/**
 * POST /api/student/viva/[sessionId]/complete — persist the spoken transcript
 * and grade it. Ownership is enforced by (id AND student_id) — a session id
 * alone grants nothing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Paywall: AI features need a trial, subscription, or university seat
    const access = await checkPaidAccess(session.user.id);
    if (!access.allowed) return paymentRequiredResponse(access.reason);
    const { sessionId } = await params;

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid transcript payload" },
        { status: 400 },
      );
    }
    const transcript = parsed.data.transcript as VivaTurn[];

    const [viva] = await pgDb
      .select({
        id: VivaSessionSchema.id,
        status: VivaSessionSchema.status,
        focusTopic: VivaSessionSchema.focusTopic,
        courseId: VivaSessionSchema.courseId,
        startedAt: VivaSessionSchema.startedAt,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
      })
      .from(VivaSessionSchema)
      .innerJoin(CourseSchema, eq(VivaSessionSchema.courseId, CourseSchema.id))
      .where(
        and(
          eq(VivaSessionSchema.id, sessionId),
          eq(VivaSessionSchema.studentId, session.user.id),
        ),
      )
      .limit(1);
    if (!viva) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (viva.status !== "active") {
      return NextResponse.json(
        { error: "Session already completed" },
        { status: 409 },
      );
    }

    const now = new Date();

    // Too short to grade, or explicitly abandoned: close without a rubric.
    const studentTurns = transcript.filter((t) => t.role === "student").length;
    if (parsed.data.abandoned || studentTurns < 2) {
      await pgDb
        .update(VivaSessionSchema)
        .set({
          status: "abandoned",
          transcript,
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(VivaSessionSchema.id, viva.id));
      return NextResponse.json({ status: "abandoned", rubric: null });
    }

    const university = await getUserUniversity(session.user.id);

    // Integrity guard: the Live audio flows browser<->Google directly, so the
    // transcript is client-reported and forgeable. Bind it to the only thing
    // the client cannot forge — the server-observed session window. Real
    // speech runs ~12-15 chars/sec; ~25 chars/sec across both speakers is a
    // generous ceiling, and no gradeable multi-question viva fits in <60s.
    const elapsedSeconds = Math.max(
      (now.getTime() - viva.startedAt.getTime()) / 1000,
      1,
    );
    const transcriptChars = transcript.reduce((n, t) => n + t.text.length, 0);
    if (elapsedSeconds < 60 || transcriptChars > elapsedSeconds * 25) {
      await pgDb
        .update(VivaSessionSchema)
        .set({
          status: "abandoned",
          transcript,
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(VivaSessionSchema.id, viva.id));
      await recordAIDecision({
        universityId: university?.id ?? null,
        decisionType: "grading",
        actor: "viva-coach",
        subjectType: "viva_session",
        subjectId: viva.id,
        userId: session.user.id,
        model: "none",
        inputSummary: `Viva (${viva.courseCode}) rejected before scoring: ${transcriptChars} transcript chars in ${Math.round(elapsedSeconds)}s session window`,
        decision:
          "action: refused to grade — transcript implausible for the server-observed session duration",
        confidence: 1,
        status: "rejected",
        metadata: {
          feature: "viva",
          flag: "implausible_transcript",
          transcriptChars,
          elapsedSeconds: Math.round(elapsedSeconds),
        },
      }).catch((error) => logger.warn("ledger write failed", error));
      return NextResponse.json(
        {
          error:
            "Transcript is inconsistent with the session duration and cannot be graded",
        },
        { status: 422 },
      );
    }

    const rubric = await scoreVivaTranscript({
      sessionId: viva.id,
      studentId: session.user.id,
      universityId: university?.id ?? null,
      courseCode: viva.courseCode,
      courseTitle: viva.courseTitle,
      focusTopic: viva.focusTopic,
      transcript,
    });

    await pgDb
      .update(VivaSessionSchema)
      .set({
        status: "completed",
        transcript,
        rubric,
        overallScore: rubric.overallScore,
        endedAt: now,
        updatedAt: now,
      })
      .where(eq(VivaSessionSchema.id, viva.id));

    return NextResponse.json({ status: "completed", rubric });
  } catch (error) {
    logger.error("failed to complete viva", error);
    return NextResponse.json(
      { error: "Failed to grade viva session" },
      { status: 500 },
    );
  }
}

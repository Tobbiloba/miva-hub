import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { type VivaTurn, scoreVivaTranscript } from "@/lib/ai/viva";
import { getUserUniversity } from "@/lib/tenant";
import { getSession } from "auth/server";
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
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

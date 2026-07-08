import { type ModelMessage, generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserUniversity } from "@/lib/tenant";
import { getSession } from "auth/server";
import { buildCourseTutorContext } from "lib/ai/course-tutor-context";
import { recordAIDecision } from "lib/ai/decision-ledger";
import { customModelProvider } from "lib/ai/models";
import {
  PROFESSOR_MODEL,
  buildProfessorSystemPrompt,
  getOrCreateProfessor,
} from "lib/ai/professor";
import { pgDb } from "lib/db/pg/db.pg";
import { StudentEnrollmentSchema } from "lib/db/pg/schema.pg";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "AI Professor API: " });

export const maxDuration = 60;

async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const [row] = await pgDb
    .select({ id: StudentEnrollmentSchema.id })
    .from(StudentEnrollmentSchema)
    .where(
      and(
        eq(StudentEnrollmentSchema.studentId, userId),
        eq(StudentEnrollmentSchema.courseId, courseId),
        eq(StudentEnrollmentSchema.status, "enrolled"),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * GET /api/student/professor/[courseId] — meet the course's AI professor.
 * Generates the persona on first access.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = await params;
    if (!z.string().uuid().safeParse(courseId).success) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }
    // Access from the session's enrollment — courseId alone grants nothing
    if (!(await isEnrolled(session.user.id, courseId))) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 404 },
      );
    }

    const professor = await getOrCreateProfessor(courseId);
    if (!professor) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    return NextResponse.json({
      professor: {
        name: professor.name,
        title: professor.title,
        bio: professor.bio,
        traits: professor.traits,
        greeting: professor.greeting,
      },
    });
  } catch (error) {
    logger.error("get professor failed", error);
    return NextResponse.json(
      { error: "Failed to load professor" },
      { status: 500 },
    );
  }
}

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional(),
});

/**
 * POST /api/student/professor/[courseId] — text office hours: chat with the
 * professor persona, grounded in the course materials.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { courseId } = await params;

    const rateLimit = checkRateLimit(`professor:${userId}`, 15, 60);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const parsed = chatBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { message, history = [] } = parsed.data;

    // Enrollment + tenancy: context only builds for the session user's course
    const context = await buildCourseTutorContext(userId, courseId);
    if (!context) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 404 },
      );
    }
    const professor = await getOrCreateProfessor(courseId);
    if (!professor) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const model = await customModelProvider.getModel({
      provider: "google",
      model: PROFESSOR_MODEL,
    });
    const messages: ModelMessage[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: message },
    ];
    const { text: answer } = await generateText({
      model,
      maxOutputTokens: 2048,
      system: buildProfessorSystemPrompt(
        professor,
        context.course,
        context.contextText,
      ),
      messages,
    });

    const university = await getUserUniversity(userId);
    await recordAIDecision({
      universityId: university?.id ?? null,
      decisionType: "tutoring",
      actor: "ai-professor",
      subjectType: "course",
      subjectId: courseId,
      userId,
      model: PROFESSOR_MODEL,
      inputSummary: `Office-hours question (${context.course.courseCode}): ${message.slice(0, 200)}`,
      decision: `action: answered in character as ${professor.name} (${answer.length} chars)`,
      confidence: 1,
      status: "executed",
      metadata: { feature: "ai-professor", channel: "chat" },
    }).catch((error) => logger.warn("ledger write failed", error));

    return NextResponse.json({ answer, professor: { name: professor.name } });
  } catch (error) {
    logger.error("professor chat failed", error);
    return NextResponse.json(
      { error: "Failed to get an answer" },
      { status: 500 },
    );
  }
}

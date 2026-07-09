import { type ModelMessage, generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "auth/server";
import { buildCourseTutorContext } from "lib/ai/course-tutor-context";
import { recordAIDecision } from "lib/ai/decision-ledger";
import { customModelProvider } from "lib/ai/models";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Course Tutor API: " });

export const maxDuration = 60;

// gemini-2.5-flash: 1M-token context fits an entire course's materials,
// and it is available on all API tiers (2.5-pro has no free-tier quota).
const TUTOR_MODEL = "gemini-2.5-flash";

const bodySchema = z.object({
  courseId: z.string().uuid(),
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

const buildSystemPrompt = (contextText: string) =>
  `You are the Askly course tutor. You help a student understand THEIR course using ONLY the course materials below.

Strict rules:
- Answer only from the COURSE MATERIALS sources. Each source is numbered [S1], [S2], ...
- Every factual claim about course content must cite its source inline, e.g. "Variables are covered in week 2 [S3]."
- If the materials do not cover the question, say so plainly and suggest which material comes closest — never invent syllabus content, deadlines, or grading policy.
- Teach, don't just answer: explain the concept, then check understanding with one short follow-up question when appropriate.
- Be concise and encouraging. Use simple examples. Format math and code readably.

${contextText}`;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rateLimit = checkRateLimit(`tutor:${userId}`, 15, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { courseId, message, history = [] } = parsed.data;

    // Tenant + access check: context is only built for a course the
    // session user is actively enrolled in. courseId alone grants nothing.
    const context = await buildCourseTutorContext(userId, courseId);
    if (!context) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 404 },
      );
    }

    if (context.sources.length === 0) {
      return NextResponse.json(
        {
          error:
            "This course has no published materials yet, so the tutor has nothing to teach from.",
        },
        { status: 409 },
      );
    }

    const messages: ModelMessage[] = [
      ...history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      { role: "user" as const, content: message },
    ];

    const model = await customModelProvider.getModel({
      provider: "google",
      model: TUTOR_MODEL,
    });

    const startedAt = Date.now();
    const result = await generateText({
      model,
      system: buildSystemPrompt(context.contextText),
      messages,
    });
    const reply = result.text.trim();

    // Which sources did the answer actually cite?
    const citedIndexes = new Set(
      [...reply.matchAll(/\[S(\d+)\]/g)].map((match) => Number(match[1])),
    );
    const citedSources = context.sources.filter((source) =>
      citedIndexes.has(source.index),
    );

    const decisionId = await recordAIDecision({
      universityId: context.course.universityId,
      decisionType: "tutoring",
      actor: "tutor-agent",
      subjectType: "course",
      subjectId: context.course.id,
      userId,
      model: TUTOR_MODEL,
      inputSummary: `${context.course.courseCode}: ${message.slice(0, 500)}`,
      decision: reply.slice(0, 500),
      // Cited answers are grounded in course material; uncited ones are weaker.
      confidence: citedSources.length > 0 ? 0.9 : 0.6,
      status: "executed",
      metadata: {
        courseCode: context.course.courseCode,
        sourcesAvailable: context.sources.length,
        sourcesCited: citedSources.map((source) => source.index),
        contextCharacters: context.totalCharacters,
        latencyMs: Date.now() - startedAt,
      },
    });

    return NextResponse.json({
      reply,
      citedSources,
      sources: context.sources,
      decisionId,
    });
  } catch (error) {
    logger.error("tutor request failed", error);
    return NextResponse.json(
      { error: "The tutor is unavailable right now. Please try again." },
      { status: 500 },
    );
  }
}

/** List the session student's enrolled courses for the tutor course picker. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pgAcademicRepository } = await import(
      "@/lib/db/pg/repositories/academic-repository.pg"
    );
    const courses = await pgAcademicRepository.getStudentCourses(
      session.user.id,
    );

    return NextResponse.json({
      courses: courses.map(({ course }) => ({
        id: course.id,
        courseCode: course.courseCode,
        title: course.title,
      })),
    });
  } catch (error) {
    logger.error("failed to list tutor courses", error);
    return NextResponse.json(
      { error: "Failed to load courses" },
      { status: 500 },
    );
  }
}

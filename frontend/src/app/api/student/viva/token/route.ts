import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { buildCourseTutorContext } from "@/lib/ai/course-tutor-context";
import { VIVA_LIVE_MODEL, buildVivaSystemPrompt } from "@/lib/ai/viva";
import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { VivaSessionSchema } from "lib/db/pg/schema.pg";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Viva Token API: " });

/**
 * POST /api/student/viva/token — mint an ephemeral Gemini Live API token for
 * a viva session. The token is single-use and its liveConnectConstraints lock
 * the model + examiner system prompt server-side, so the browser never sees
 * the real API key and cannot change the examiner's grounding.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Live sessions are expensive: 3 new vivas per 5 minutes per student.
    const rateLimit = checkRateLimit(`viva:${session.user.id}`, 3, 300);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Viva coach is not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      courseId?: string;
      focusTopic?: string;
    };
    if (!body.courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 },
      );
    }
    const focusTopic = body.focusTopic?.trim().slice(0, 200) || null;

    // Enrollment check + course-grounded context in one shot (session-derived).
    const context = await buildCourseTutorContext(
      session.user.id,
      body.courseId,
    );
    if (!context) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 403 },
      );
    }

    const systemPrompt = buildVivaSystemPrompt({
      courseCode: context.course.courseCode,
      courseTitle: context.course.title,
      studentName: session.user.name || "the candidate",
      focusTopic,
      contextText: context.contextText,
    });

    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60_000).toISOString(),
        liveConnectConstraints: {
          model: VIVA_LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemPrompt,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    if (!token.name) {
      throw new Error("Token service returned no token name");
    }

    const [viva] = await pgDb
      .insert(VivaSessionSchema)
      .values({
        studentId: session.user.id,
        courseId: body.courseId,
        focusTopic,
        model: VIVA_LIVE_MODEL,
      })
      .returning({ id: VivaSessionSchema.id });

    return NextResponse.json({
      sessionId: viva.id,
      token: token.name,
      model: VIVA_LIVE_MODEL,
      course: {
        courseCode: context.course.courseCode,
        title: context.course.title,
      },
    });
  } catch (error) {
    logger.error("failed to mint viva token", error);
    return NextResponse.json(
      { error: "Failed to start viva session" },
      { status: 500 },
    );
  }
}

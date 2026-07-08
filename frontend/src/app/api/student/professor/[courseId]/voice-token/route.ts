import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildCourseTutorContext } from "@/lib/ai/course-tutor-context";
import { getOrCreateProfessor } from "@/lib/ai/professor";
import { VIVA_LIVE_MODEL } from "@/lib/ai/viva";
import { getSession } from "auth/server";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({
  message: "Professor Voice Token API: ",
});

/**
 * POST /api/student/professor/[courseId]/voice-token — mint an ephemeral
 * Gemini Live token for voice office hours with the course's AI professor.
 * Same security model as the viva token: single-use, constraints lock the
 * model + persona server-side, the browser never sees the real API key.
 */
export async function POST(
  _request: NextRequest,
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

    const rateLimit = checkRateLimit(`office-hours:${session.user.id}`, 3, 300);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Office hours are not configured" },
        { status: 503 },
      );
    }

    // Enrollment check + course-grounded context (session-derived)
    const context = await buildCourseTutorContext(session.user.id, courseId);
    if (!context) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 403 },
      );
    }
    const professor = await getOrCreateProfessor(courseId);
    if (!professor) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const studentFirstName = (session.user.name || "the student").split(" ")[0];
    const systemPrompt = [
      `You are ${professor.name}, ${professor.title}, holding live voice office hours for ${context.course.courseCode} — ${context.course.title} with your student ${studentFirstName}.`,
      "",
      "PERSONA:",
      professor.personaPrompt,
      "",
      "Office-hours conduct:",
      "- This is a spoken conversation: natural spoken sentences, no markdown, no lists.",
      "- Keep each reply under 30 seconds of speech; pause to let the student respond.",
      "- Ground every factual claim in the course materials below. If the materials do not cover it, say so plainly.",
      "- Open by greeting the student in character and asking what they want to work through today.",
      "",
      context.contextText.slice(0, 60_000),
    ].join("\n");

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

    return NextResponse.json({
      token: token.name,
      model: VIVA_LIVE_MODEL,
      professor: { name: professor.name, title: professor.title },
      course: {
        courseCode: context.course.courseCode,
        title: context.course.title,
      },
    });
  } catch (error) {
    logger.error("failed to mint office-hours token", error);
    return NextResponse.json(
      { error: "Failed to start office hours" },
      { status: 500 },
    );
  }
}

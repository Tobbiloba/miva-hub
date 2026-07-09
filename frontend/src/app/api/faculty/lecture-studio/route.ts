import { NextRequest, NextResponse } from "next/server";

import { isCourseInstructor } from "@/lib/academic/lecture-study";
import { runLecturePipeline } from "@/lib/ai/lecture-pipeline";
import { requireFaculty } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getUserUniversity } from "@/lib/tenant";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Lecture Studio API: " });

// Gemini inline media caps the whole request around 20MB; base64 adds ~33%.
const MAX_FILE_BYTES = 14 * 1024 * 1024;

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

/**
 * POST /api/faculty/lecture-studio — Lecture-to-Everything.
 * A course instructor uploads a lecture recording; one Gemini multimodal call
 * produces transcript + timestamped notes + flashcards + quiz + audio recap,
 * all persisted against a new course_material row.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("courseId") as string | null;
    const weekNumberRaw = formData.get("weekNumber") as string | null;
    const title = (formData.get("title") as string | null)?.trim();
    const description =
      ((formData.get("description") as string | null) || "").trim() || null;

    const weekNumber = weekNumberRaw ? parseInt(weekNumberRaw, 10) : NaN;
    if (
      !file ||
      !courseId ||
      !title ||
      !Number.isInteger(weekNumber) ||
      weekNumber < 1
    ) {
      return NextResponse.json(
        { error: "file, courseId, weekNumber and title are required" },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported media type: ${file.type || "unknown"}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error:
            "File exceeds the 14MB processing limit. Compress the recording to audio (e.g. 64kbps mp3) and retry.",
        },
        { status: 400 },
      );
    }

    // Tenancy + authorization from the session, never the request body
    const hasAccess = await isCourseInstructor(session.user.id, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You are not assigned to teach this course" },
        { status: 403 },
      );
    }

    const course = await pgAcademicRepository.getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const university = await getUserUniversity(session.user.id);

    // Material row first: outputs hang off it, and the transcript lands here.
    // The original media is processed inline and not retained (S3 optional).
    const material = await pgAcademicRepository.insertCourseMaterial({
      courseId,
      title,
      description,
      materialType: "lecture",
      weekNumber,
      contentUrl: null,
      publicUrl: null,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedById: session.user.id,
    });

    const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const result = await runLecturePipeline({
      materialId: material.id,
      courseTitle: course.title,
      courseCode: course.courseCode,
      lectureTitle: title,
      weekNumber,
      universityId: university?.id ?? null,
      uploadedById: session.user.id,
      file: { dataBase64, mediaType: file.type, fileName: file.name },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: `Lecture processing failed: ${result.error}` },
        { status: 502 },
      );
    }

    const { studyKit } = result;
    return NextResponse.json(
      {
        success: true,
        materialId: material.id,
        jobId: result.jobId,
        studyKit: {
          summary: studyKit.summary,
          keyConcepts: studyKit.keyConcepts,
          difficulty: studyKit.difficulty,
          noteSections: studyKit.timestampedNotes.length,
          flashcards: studyKit.flashcards.length,
          quizQuestions: studyKit.quiz.length,
          recapAudio: result.recapAudio,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("lecture studio failed", error);
    return NextResponse.json(
      { error: "Failed to process lecture" },
      { status: 500 },
    );
  }
}

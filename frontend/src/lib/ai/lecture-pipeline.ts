import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type UserContent, generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { customModelProvider } from "@/lib/ai/models";
import { pgDb } from "lib/db/pg/db.pg";
import {
  AIProcessedContentSchema,
  AIProcessingJobSchema,
  CourseMaterialSchema,
} from "lib/db/pg/schema.pg";
import globalLogger from "logger";
import { recordAIDecision } from "./decision-ledger";

const logger = globalLogger.withDefaults({ message: "Lecture Pipeline: " });

export const LECTURE_MODEL = "gemini-2.5-flash";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/** Where recap audio files live. Served via /api/lecture-study/[id]/recap-audio. */
export const RECAP_AUDIO_DIR = path.join(process.cwd(), "data", "recaps");

export function recapAudioPath(materialId: string): string {
  return path.join(RECAP_AUDIO_DIR, `${materialId}.wav`);
}

// ── Study kit schema (what Gemini must return) ─────────────────────────────

const studyKitSchema = z.object({
  transcript: z
    .string()
    .describe(
      "A faithful transcript of the lecture audio. For very long lectures, a lightly condensed transcript is acceptable, but preserve the lecturer's actual explanations, examples, and terminology.",
    ),
  summary: z
    .string()
    .describe("A 3-6 sentence summary of what the lecture covered."),
  keyConcepts: z
    .array(z.string())
    .min(3)
    .max(12)
    .describe("The key concepts/terms introduced, most important first."),
  timestampedNotes: z
    .array(
      z.object({
        timestamp: z
          .string()
          .describe("Position in the recording, e.g. '00:03:15'"),
        heading: z.string().describe("Short section heading"),
        notes: z
          .string()
          .describe("Detailed study notes for this section, markdown allowed"),
      }),
    )
    .min(3)
    .describe("Timestamped lecture notes, in chronological order."),
  flashcards: z
    .array(
      z.object({
        front: z.string().describe("Question or prompt testing a concept"),
        back: z.string().describe("Concise, correct answer"),
      }),
    )
    .min(6)
    .max(16)
    .describe("Spaced-repetition flashcards covering the lecture."),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z
          .string()
          .describe("Why the correct answer is correct, 1-2 sentences"),
      }),
    )
    .min(5)
    .max(10)
    .describe("Multiple-choice quiz on the lecture content."),
  recapScript: z
    .string()
    .describe(
      "A ~500-800 word spoken-style recap of the lecture, written to be read aloud as a short audio episode. Warm, clear, no markdown, no stage directions.",
    ),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

export type LectureStudyKit = z.infer<typeof studyKitSchema>;

export interface LecturePipelineInput {
  materialId: string;
  courseTitle: string;
  courseCode: string;
  lectureTitle: string;
  weekNumber: number;
  universityId: string | null;
  uploadedById: string;
  file: {
    dataBase64: string;
    mediaType: string;
    fileName: string;
  };
}

export type LecturePipelineResult =
  | { ok: true; studyKit: LectureStudyKit; recapAudio: boolean; jobId: string }
  | { ok: false; error: string; jobId: string | null };

/**
 * Lecture-to-Everything: one multimodal Gemini call turns a lecture recording
 * into a transcript, timestamped notes, flashcards, a quiz and a recap script.
 * The transcript lands on course_material.transcriptText, which the course
 * tutor context and starter-flashcard generator already read — so the tutor
 * "knows" the lecture the moment this completes.
 */
export async function runLecturePipeline(
  input: LecturePipelineInput,
): Promise<LecturePipelineResult> {
  // Job row first — the audit trail must exist even if generation fails.
  const [job] = await pgDb
    .insert(AIProcessingJobSchema)
    .values({
      courseMaterialId: input.materialId,
      jobType: "video_transcription",
      status: "processing",
      startedAt: new Date(),
      metadata: {
        pipeline: "lecture-to-everything",
        model: LECTURE_MODEL,
        fileName: input.file.fileName,
        mediaType: input.file.mediaType,
      },
    })
    .returning({ id: AIProcessingJobSchema.id });

  try {
    const userContent: UserContent = [
      {
        type: "text",
        text: [
          `Course: ${input.courseCode} — ${input.courseTitle}`,
          `Lecture: "${input.lectureTitle}" (week ${input.weekNumber})`,
          "",
          "The lecture recording is attached. Listen to the ENTIRE recording, then produce the full study kit described by the output schema.",
          "Ground everything strictly in what the lecturer actually said — never invent content that is not in the recording.",
          "Timestamps must reflect real positions in the recording.",
        ].join("\n"),
      },
      {
        type: "file",
        data: input.file.dataBase64,
        mediaType: input.file.mediaType,
      },
    ];

    const model = await customModelProvider.getModel({
      provider: "google",
      model: LECTURE_MODEL,
    });

    const { object: studyKit } = await generateObject({
      model,
      schema: studyKitSchema,
      maxOutputTokens: 32_000,
      system:
        "You are a meticulous university teaching assistant. You turn lecture recordings into complete, accurate study kits for students. You never fabricate content the lecturer did not cover.",
      messages: [{ role: "user", content: userContent }],
    });

    const wordCount = studyKit.transcript.split(/\s+/).filter(Boolean).length;
    const now = new Date();

    // Transcript onto the material row — this is what feeds the tutor context.
    await pgDb
      .update(CourseMaterialSchema)
      .set({
        transcriptText: studyKit.transcript,
        transcriptSource: "gemini",
        transcriptStatus: "extracted",
        transcriptExtractedAt: now,
        transcriptWordCount: wordCount,
        updatedAt: now,
      })
      .where(eq(CourseMaterialSchema.id, input.materialId));

    // Best-effort TTS recap — never fails the pipeline.
    const recapAudio = await generateRecapAudio(
      input.materialId,
      studyKit.recapScript,
    );

    // Full study kit into ai_processed_content (one row per material).
    await pgDb
      .insert(AIProcessedContentSchema)
      .values({
        courseMaterialId: input.materialId,
        extractedText: studyKit.transcript,
        aiSummary: studyKit.summary,
        keyConcepts: studyKit.keyConcepts,
        difficulty: studyKit.difficulty,
        estimatedReadTime: Math.max(1, Math.round(wordCount / 200)),
        wordCount,
        processingMetadata: {
          pipeline: "lecture-to-everything",
          model: LECTURE_MODEL,
          timestampedNotes: studyKit.timestampedNotes,
          flashcards: studyKit.flashcards,
          quiz: studyKit.quiz,
          recapScript: studyKit.recapScript,
          recapAudio,
        },
      })
      .onConflictDoUpdate({
        target: AIProcessedContentSchema.courseMaterialId,
        set: {
          extractedText: studyKit.transcript,
          aiSummary: studyKit.summary,
          keyConcepts: studyKit.keyConcepts,
          difficulty: studyKit.difficulty,
          estimatedReadTime: Math.max(1, Math.round(wordCount / 200)),
          wordCount,
          processingMetadata: {
            pipeline: "lecture-to-everything",
            model: LECTURE_MODEL,
            timestampedNotes: studyKit.timestampedNotes,
            flashcards: studyKit.flashcards,
            quiz: studyKit.quiz,
            recapScript: studyKit.recapScript,
            recapAudio,
          },
          updatedAt: now,
        },
      });

    await pgDb
      .update(AIProcessingJobSchema)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(AIProcessingJobSchema.id, job.id));

    await recordAIDecision({
      universityId: input.universityId,
      decisionType: "content",
      actor: "lecture-pipeline",
      subjectType: "course_material",
      subjectId: input.materialId,
      userId: input.uploadedById,
      model: LECTURE_MODEL,
      inputSummary: `Lecture "${input.lectureTitle}" (${input.courseCode}, week ${input.weekNumber}) — ${input.file.fileName}`,
      decision: `action: generated study kit (${studyKit.timestampedNotes.length} note sections, ${studyKit.flashcards.length} flashcards, ${studyKit.quiz.length} quiz questions${recapAudio ? ", audio recap" : ""})`,
      confidence: 1,
      status: "executed",
      metadata: {
        jobId: job.id,
        transcriptWordCount: wordCount,
        recapAudio,
      },
    });

    return { ok: true, studyKit, recapAudio, jobId: job.id };
  } catch (error) {
    logger.error("pipeline failed", error);
    const message =
      error instanceof Error ? error.message : "Lecture processing failed";
    await pgDb
      .update(AIProcessingJobSchema)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: message.slice(0, 2000),
      })
      .where(eq(AIProcessingJobSchema.id, job.id))
      .catch(() => {});
    await pgDb
      .update(CourseMaterialSchema)
      .set({
        transcriptStatus: "failed",
        transcriptErrorMessage: message.slice(0, 2000),
      })
      .where(eq(CourseMaterialSchema.id, input.materialId))
      .catch(() => {});
    return { ok: false, error: message, jobId: job?.id ?? null };
  }
}

// ── Audio recap (Gemini TTS) ────────────────────────────────────────────────

/**
 * Gemini TTS returns raw 24kHz 16-bit mono PCM; wrap it in a WAV header and
 * write it next to the app so the recap-audio route can stream it.
 * Best-effort: returns false on any failure.
 */
async function generateRecapAudio(
  materialId: string,
  script: string,
): Promise<boolean> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return false;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: script }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
          },
        }),
      },
    );
    if (!res.ok) {
      logger.warn(`TTS request failed: ${res.status} ${await res.text()}`);
      return false;
    }

    const payload = await res.json();
    const base64: string | undefined =
      payload?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) {
      logger.warn("TTS response had no audio data");
      return false;
    }

    const pcm = Buffer.from(base64, "base64");
    await mkdir(RECAP_AUDIO_DIR, { recursive: true });
    await writeFile(recapAudioPath(materialId), pcmToWav(pcm, 24_000, 1));
    return true;
  } catch (error) {
    logger.warn("TTS generation failed", error);
    return false;
  }
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

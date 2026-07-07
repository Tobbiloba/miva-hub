import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";

import { loadLectureStudy } from "@/lib/academic/lecture-study";
import { recapAudioPath } from "@/lib/ai/lecture-pipeline";
import { getSession } from "@/lib/auth/server";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Recap Audio API: " });

/**
 * GET /api/lecture-study/[materialId]/recap-audio — streams the Gemini-TTS
 * lecture recap (WAV). Same access rules as the study kit.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;
    const access = await loadLectureStudy(materialId, session.user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.status === 404 ? "Not found" : "Forbidden" },
        { status: access.status },
      );
    }

    let audio: Buffer;
    try {
      audio = await readFile(recapAudioPath(materialId));
    } catch {
      return NextResponse.json(
        { error: "No audio recap for this lecture" },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    logger.error("stream failed", error);
    return NextResponse.json(
      { error: "Failed to load recap audio" },
      { status: 500 },
    );
  }
}

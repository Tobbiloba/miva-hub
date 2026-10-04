import { NextRequest, NextResponse } from "next/server";

import { loadLectureStudy } from "@/lib/academic/lecture-study";
import { getApiSession } from "@/lib/auth/server";
import { checkPaidAccess, paymentRequiredResponse } from "@/lib/billing/access";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Lecture Study API: " });

/**
 * GET /api/lecture-study/[materialId] — the full study kit for a processed
 * lecture. Visible to the uploader, course instructors, and enrolled students.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Paywall: study kits are paid content (trial, subscription, or seat)
    const paid = await checkPaidAccess(session.user.id);
    if (!paid.allowed) return paymentRequiredResponse(paid.reason);

    const { materialId } = await params;
    const access = await loadLectureStudy(materialId, session.user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.status === 404 ? "Not found" : "Forbidden" },
        { status: access.status },
      );
    }

    const { material, kit } = access.record;
    const meta = kit?.processingMetadata ?? {};

    return NextResponse.json({
      material,
      studyKit: kit
        ? {
            summary: kit.summary,
            keyConcepts: kit.keyConcepts,
            difficulty: kit.difficulty,
            estimatedReadTime: kit.estimatedReadTime,
            timestampedNotes: meta.timestampedNotes ?? [],
            flashcards: meta.flashcards ?? [],
            quiz: meta.quiz ?? [],
            recapScript: meta.recapScript ?? null,
            recapAudio: !!meta.recapAudio,
          }
        : null,
    });
  } catch (error) {
    logger.error("fetch failed", error);
    return NextResponse.json(
      { error: "Failed to load study kit" },
      { status: 500 },
    );
  }
}

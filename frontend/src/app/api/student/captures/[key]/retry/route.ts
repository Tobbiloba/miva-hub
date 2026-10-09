import { requireStudent } from "@/lib/auth/student";
import { CaptureError, retryCapture } from "@/lib/ingest/captures";
import logger from "logger";
import { NextRequest, NextResponse, after } from "next/server";

export const maxDuration = 300;

/**
 * POST /api/student/captures/:key/retry — retry a failed capture. Answers
 * 202 at once; the work runs after the response.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  const { key } = await params;
  try {
    const work = await retryCapture(session.user.id, decodeURIComponent(key));
    after(() =>
      work().catch((error) => logger.error("[captures] retry failed", error)),
    );
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    if (error instanceof CaptureError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }
}

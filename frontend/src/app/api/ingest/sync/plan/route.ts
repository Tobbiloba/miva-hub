import {
  LmsCoursesSchema,
  invalidBody,
  syncErrorResponse,
  syncUser,
} from "@/lib/capture-sync/api";
import { planSync } from "@/lib/capture-sync/sync";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ingest/sync/plan — which of the student's LMS courses Askly can
 * capture. Read-only: nothing is enrolled or requested until /start.
 */
export async function POST(request: NextRequest) {
  const userId = await syncUser();
  if (userId instanceof NextResponse) return userId;
  const limit = await checkRateLimit(`sync-plan:${userId}`, 60, 60 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = LmsCoursesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return invalidBody(parsed.error);
  try {
    return NextResponse.json({
      courses: await planSync(userId, parsed.data.courses),
    });
  } catch (error) {
    return syncErrorResponse(error);
  }
}

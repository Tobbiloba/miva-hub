import { paymentRequiredResponse } from "@/lib/billing/access";
import {
  LmsCoursesSchema,
  invalidBody,
  syncErrorResponse,
  syncUser,
} from "@/lib/capture-sync/api";
import { startSync } from "@/lib/capture-sync/sync";
import { checkCaptureAccess } from "@/lib/ingest/access";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ingest/sync/start — begin capturing the LMS courses the student
 * picked: enrolls the ones Askly has, asks admins to add the rest, and
 * returns what the extension should capture.
 */
export async function POST(request: NextRequest) {
  const userId = await syncUser();
  if (userId instanceof NextResponse) return userId;
  const limit = await checkRateLimit(`sync-start:${userId}`, 20, 60 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);

  const access = await checkCaptureAccess(userId);
  if (!access.allowed) return paymentRequiredResponse(access.reason);

  const parsed = LmsCoursesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return invalidBody(parsed.error);
  try {
    return NextResponse.json(await startSync(userId, parsed.data.courses));
  } catch (error) {
    return syncErrorResponse(error);
  }
}

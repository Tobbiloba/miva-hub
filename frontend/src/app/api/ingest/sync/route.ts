import { invalidBody, syncUser } from "@/lib/capture-sync/api";
import { getSync, updateSync } from "@/lib/capture-sync/sync";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const count = z.number().int().min(0).max(10_000);

const PatchSchema = z.object({
  status: z
    .enum(["running", "done", "stopped", "needs_login", "failed"])
    .optional(),
  courses: z
    .array(
      z.object({
        lmsId: z.number().int().positive(),
        total: count,
        captured: count,
        skipped: count,
        failed: count,
        done: z.boolean(),
      }),
    )
    .max(80)
    .optional(),
  currentItem: z.string().trim().max(300).nullish(),
  error: z.string().trim().max(500).nullish(),
});

/** GET /api/ingest/sync — the student's automatic capture, for the page/popup. */
export async function GET() {
  const userId = await syncUser();
  if (userId instanceof NextResponse) return userId;
  return NextResponse.json({ sync: await getSync(userId) });
}

/** PATCH /api/ingest/sync — progress reported by the extension while it runs. */
export async function PATCH(request: NextRequest) {
  const userId = await syncUser();
  if (userId instanceof NextResponse) return userId;
  const limit = await checkRateLimit(`sync-progress:${userId}`, 1200, 60 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidBody(parsed.error);
  return NextResponse.json({ sync: await updateSync(userId, parsed.data) });
}

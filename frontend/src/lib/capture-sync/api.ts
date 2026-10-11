import "server-only";

import { getIngestUserId } from "@/lib/extension/token";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SyncError } from "./sync";

/** Shared pieces of the /api/ingest/sync routes (extension token or session). */

export const LmsCoursesSchema = z.object({
  courses: z
    .array(
      z.object({
        lmsId: z.number().int().positive(),
        shortname: z.string().trim().max(200),
        fullname: z.string().trim().max(400),
      }),
    )
    .min(1)
    .max(80),
});

export async function syncUser(): Promise<string | NextResponse> {
  const userId = await getIngestUserId();
  return (
    userId ??
    NextResponse.json({ error: "Authentication required" }, { status: 401 })
  );
}

export function syncErrorResponse(error: unknown): NextResponse {
  if (error instanceof SyncError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  throw error;
}

export function invalidBody(error: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: error.issues[0]?.message ?? "Invalid request" },
    { status: 400 },
  );
}

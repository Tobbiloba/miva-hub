import { getIngestUserId } from "@/lib/extension/token";
import { listStudentCaptures } from "@/lib/ingest/captures";
import { NextResponse } from "next/server";

/**
 * GET /api/ingest/captures: the caller's captures and their state, for the
 * Askly Capture extension (bearer token) as well as the web app (session).
 * Always scoped to the authenticated user.
 */
export async function GET() {
  const userId = await getIngestUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const captures = await listStudentCaptures(userId);
  return NextResponse.json({ captures });
}

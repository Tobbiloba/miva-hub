import { requireStudent } from "@/lib/auth/student";
import { listStudentCaptures } from "@/lib/ingest/captures";
import { NextResponse } from "next/server";

/**
 * GET /api/student/captures — what the student has captured with Askly
 * Capture and whether Askly can answer from each item yet
 * (lib/ingest/captures). Scoped to the session's student.
 */
export async function GET() {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  const captures = await listStudentCaptures(session.user.id);
  return NextResponse.json({ captures });
}

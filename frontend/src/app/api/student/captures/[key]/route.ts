import { requireStudent } from "@/lib/auth/student";
import { CaptureError, deleteCapture } from "@/lib/ingest/captures";
import { NextRequest, NextResponse } from "next/server";

/** DELETE /api/student/captures/:key — remove one of your private captures. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  const { key } = await params;
  try {
    await deleteCapture(session.user.id, decodeURIComponent(key));
    return NextResponse.json({ ok: true });
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

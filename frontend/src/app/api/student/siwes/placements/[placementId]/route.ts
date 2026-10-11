import { getLogBook } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextResponse } from "next/server";
import { z } from "zod";

/** GET /api/student/siwes/placements/:id — the placement laid out as the log book */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ placementId: string }> },
) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const { placementId } = await params;
  if (!z.string().uuid().safeParse(placementId).success) {
    return NextResponse.json({ error: "Placement not found" }, { status: 404 });
  }
  try {
    return NextResponse.json(await getLogBook(guard.userId, placementId));
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

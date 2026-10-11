import { saveMonth } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MonthBody = z.object({ summary: z.string().max(6000).nullish() });

/** PUT …/months/:YYYY-MM — the student's monthly summary */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ placementId: string; month: string }> },
) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const { placementId, month } = await params;
  const parsed = MonthBody.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    !z.string().uuid().safeParse(placementId).success ||
    !/^\d{4}-\d{2}$/.test(month)
  ) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  try {
    const row = await saveMonth(
      guard.userId,
      placementId,
      month,
      parsed.data.summary ?? null,
    );
    return NextResponse.json({ month: row });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

import { saveWeek } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const WeekBody = z.object({
  generalDescription: z.string().max(4000).nullish(),
  departmentSection: z.string().max(200).nullish(),
  projectJob: z.string().max(300).nullish(),
});

/** PUT …/weeks/:weekEnding — the student's fields of one weekly page */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ placementId: string; weekEnding: string }> },
) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const { placementId, weekEnding } = await params;
  const parsed = WeekBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(placementId).success) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }
  try {
    const week = await saveWeek(
      guard.userId,
      placementId,
      weekEnding,
      parsed.data,
    );
    return NextResponse.json({ week });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

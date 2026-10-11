import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { findEntries, logDay } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const EntryBody = z.object({
  date: Day,
  phase: z.enum(["I", "II"]).optional(),
  note: z.string().max(2000).nullish(),
  present: z.boolean().optional(),
  absenceReason: z.string().max(300).nullish(),
  replace: z.boolean().optional(),
});

/** GET /api/student/siwes/entries?from=&to= — logged days in a range */
export async function GET(request: NextRequest) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!Day.safeParse(from).success || !Day.safeParse(to).success) {
    return NextResponse.json(
      { error: "from and to must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({
      entries: await findEntries(guard.userId, from, to),
    });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

/** POST /api/student/siwes/entries — log a day (Askly drafts the wording) */
export async function POST(request: NextRequest) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  // Each save may call the model to draft the wording
  const rate = await checkRateLimit(`siwes-entry:${guard.userId}`, 30, 300);
  if (!rate.allowed) return rateLimitResponse(rate);
  const parsed = EntryBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }
  try {
    const { entry } = await logDay(guard.userId, parsed.data);
    return NextResponse.json({ entry });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

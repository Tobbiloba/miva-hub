import { getUserUniversity } from "@/lib/tenant";
import { listPlacements, savePlacement } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const optional = (max: number) => z.string().trim().max(max).nullish();
const PlacementBody = z.object({
  phase: z.enum(["I", "II"]),
  organization: z.string().trim().min(1).max(200),
  address: optional(300),
  organizationSize: z.enum(["large", "medium", "small"]).nullish(),
  productsJobs: z.array(z.string().trim().max(200)).max(6).optional(),
  structureDescription: optional(2000),
  departmentSection: optional(200),
  industrySupervisorName: optional(120),
  industrySupervisorEmail: z
    .string()
    .trim()
    .email()
    .max(200)
    .nullish()
    .or(z.literal("")),
  schoolSupervisor: optional(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** GET /api/student/siwes/placements — the student's placements (SIWES I/II) */
export async function GET() {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  return NextResponse.json({ placements: await listPlacements(guard.userId) });
}

/** POST /api/student/siwes/placements — create or update the placement for a phase */
export async function POST(request: NextRequest) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const parsed = PlacementBody.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid placement" },
      { status: 400 },
    );
  }
  try {
    const university = await getUserUniversity(guard.userId);
    const placement = await savePlacement(
      guard.userId,
      university?.id ?? null,
      parsed.data,
    );
    return NextResponse.json({ placement });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

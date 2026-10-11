import { requireSuperAdmin } from "@/lib/auth/admin";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import {
  domainBelongsTo,
  linkSchoolRequests,
  listPendingSchoolRequests,
} from "@/lib/schools/pending";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET /api/super-admin/school-requests: students waiting for their school,
 * grouped by email domain, plus the active universities to link them to.
 */
export async function GET() {
  const access = await requireSuperAdmin();
  if (access instanceof NextResponse) return access;

  const [groups, universities] = await Promise.all([
    listPendingSchoolRequests(),
    pgUniversityRepository.listActive(),
  ]);
  return NextResponse.json({
    groups,
    universities: universities.map((u) => ({
      id: u.id,
      name: u.name,
      emailDomains: u.emailDomains,
    })),
  });
}

const LinkSchema = z.object({
  emailDomain: z.string().min(3).max(253),
  universityId: z.string().uuid(),
  // Also let future students from this domain sign up straight into it
  addDomain: z.boolean().default(true),
});

/**
 * POST /api/super-admin/school-requests: link every student waiting from
 * one email domain to an active university (and email them).
 */
export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin();
  if (access instanceof NextResponse) return access;

  const parsed = LinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const emailDomain = parsed.data.emailDomain.toLowerCase().trim();
  const university = await pgUniversityRepository.findById(
    parsed.data.universityId,
  );
  if (!university || university.status !== "active") {
    return NextResponse.json(
      { error: "Pick an active university" },
      { status: 400 },
    );
  }

  const covered = university.emailDomains.some((d) =>
    domainBelongsTo(emailDomain, d),
  );
  if (parsed.data.addDomain && !covered) {
    // A domain belongs to one university only
    const claimed = await pgUniversityRepository.findClaimedDomain([
      emailDomain,
    ]);
    if (claimed) {
      return NextResponse.json(
        { error: `${emailDomain} already belongs to another university` },
        { status: 409 },
      );
    }
    await pgUniversityRepository.update(university.id, {
      emailDomains: [...university.emailDomains, emailDomain],
    });
  }

  const linked = await linkSchoolRequests({
    universityId: university.id,
    emailDomains: [emailDomain],
  });
  console.log("[Super Admin] Linked school requests:", {
    emailDomain,
    universityId: university.id,
    linked,
    by: access.user.id,
  });
  return NextResponse.json({ linked });
}

import { getApiSession } from "@/lib/auth/server";
import { getUniversityById } from "@/lib/tenant";
import { NextResponse } from "next/server";

/**
 * Return the authenticated user's university (name, domains, branding).
 * Used by admin UIs to validate emails against the tenant's domains.
 */
export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const universityId = (session.user as { universityId?: string | null })
    .universityId;
  const university = await getUniversityById(universityId);

  if (!university) {
    return NextResponse.json({ university: null });
  }

  return NextResponse.json({
    university: {
      id: university.id,
      name: university.name,
      slug: university.slug,
      emailDomains: university.emailDomains,
      logoUrl: university.logoUrl,
      primaryColor: university.primaryColor,
      supportEmail: university.supportEmail,
      status: university.status,
    },
  });
}

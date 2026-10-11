import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { emailDomain, resolveUniversityFromEmail } from "@/lib/tenant";
import { isSchoolDomain } from "lib/auth/school-domain";
import { NextRequest, NextResponse } from "next/server";

/**
 * Public endpoint: resolve which university (if any) owns an email domain.
 * Used by the signup form to tell the user where they're signing up.
 * Only exposes non-sensitive tenant fields.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`uni-resolve:${ip}`, 20, 60);
  if (!rl.allowed) return rateLimitResponse(rl);

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const university = await resolveUniversityFromEmail(email);
  if (!university) {
    // A school email can still sign up and wait for the school to be added
    return NextResponse.json({
      found: false,
      schoolEmail: isSchoolDomain(emailDomain(email)),
    });
  }

  return NextResponse.json({
    found: true,
    university: {
      name: university.name,
      slug: university.slug,
      logoUrl: university.logoUrl,
      primaryColor: university.primaryColor,
    },
  });
}

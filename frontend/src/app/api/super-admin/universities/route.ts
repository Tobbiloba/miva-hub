import { requireSuperAdmin } from "@/lib/auth/admin";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/super-admin/universities — list all tenants (platform-level).
 * Optional ?status=pending|active|suspended filter.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireSuperAdmin();
    if (access instanceof NextResponse) {
      return access;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let universities = await pgUniversityRepository.list();
    if (status && status !== "all") {
      universities = universities.filter((u) => u.status === status);
    }

    return NextResponse.json({ success: true, data: universities });
  } catch (error) {
    console.error("[Super Admin Universities] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch universities" },
      { status: 500 },
    );
  }
}

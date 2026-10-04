import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { resolveStatsScope } from "@/lib/tenant-content";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    // Check admin authentication
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Tenant scope from the SESSION (super_admin → all universities)
    const scope = await resolveStatsScope(sessionOrError.user.id);
    if (!scope) {
      return NextResponse.json(
        { error: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }

    const departments = await pgAcademicRepository.getDepartments(
      scope === "all" ? undefined : scope,
    );

    // Format for dropdown consumption
    const formattedDepartments = departments.map((dept) => ({
      value: dept.code.toLowerCase().replace(/\s+/g, "-"),
      label: dept.name,
      code: dept.code,
      id: dept.id,
    }));

    return NextResponse.json(formattedDepartments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

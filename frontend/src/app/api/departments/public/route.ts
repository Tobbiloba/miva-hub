import { NextResponse } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function GET() {
  try {
    // Public access - no authentication required for signup
    const departments = await pgAcademicRepository.getDepartments();
    
    // Format for dropdown consumption
    const formattedDepartments = departments.map(dept => ({
      value: dept.code.toLowerCase().replace(/\s+/g, '-'),
      label: dept.name,
      code: dept.code,
      id: dept.id
    }));

    return NextResponse.json(formattedDepartments);
  } catch (error) {
    console.error("Error fetching public departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}
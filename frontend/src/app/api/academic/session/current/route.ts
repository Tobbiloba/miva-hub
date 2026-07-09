import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await pgAcademicRepository.getActiveAcademicSession();

    if (!session) {
      return NextResponse.json(
        { error: "No active academic session found" },
        { status: 404 },
      );
    }

    // Convert session name format "2025/2026" to academic year "2025-2026"
    const academicYear = session.sessionName.replace("/", "-");

    // Map semester enum to enrollment semester string
    // "first" + "2025/2026" → "2025-fall", "second" + "2025/2026" → "2026-spring"
    const startYear = session.sessionName.split("/")[0];
    const endYear = session.sessionName.split("/")[1];
    const enrollmentSemester =
      session.currentSemester === "first"
        ? `${startYear}-fall`
        : `${endYear}-spring`;

    return NextResponse.json({
      sessionName: session.sessionName,
      currentSemester: session.currentSemester,
      academicYear,
      enrollmentSemester,
      status: session.status,
    });
  } catch (error) {
    console.error("Failed to fetch active session:", error);
    return NextResponse.json(
      { error: "Failed to fetch active session" },
      { status: 500 },
    );
  }
}

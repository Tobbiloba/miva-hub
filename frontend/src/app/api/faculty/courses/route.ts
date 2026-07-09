import { requireFaculty } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(
      session.user.id,
    );
    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 403 },
      );
    }

    const facultyCourses = await pgAcademicRepository.getFacultyCourses(
      facultyRecord.id,
    );

    const courses = facultyCourses.map(({ course, courseInstructor }) => ({
      id: course.id,
      courseCode: course.courseCode,
      title: course.title,
      credits: course.credits,
      semester: courseInstructor.semester,
      role: courseInstructor.role,
    }));

    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch courses",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

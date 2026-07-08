import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { isSameTenant } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

/**
 * Course materials inherit their tenant from the parent course — admins
 * may only touch materials of their own university's courses (prevents
 * cross-university IDOR).
 */
async function materialInTenant(
  adminUserId: string,
  courseId: string,
): Promise<boolean> {
  const course = await academicRepository.getCourseById(courseId);
  return !!course && (await isSameTenant(adminUserId, course.universityId));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const materialId = id;

    // Check if the course material exists — tenant-checked via parent course
    const existingMaterial =
      await academicRepository.getCourseMaterialById(materialId);
    if (
      !existingMaterial ||
      !(await materialInTenant(
        sessionOrError.user.id,
        existingMaterial.courseId,
      ))
    ) {
      return NextResponse.json(
        { success: false, message: "Course material not found" },
        { status: 404 },
      );
    }

    // Delete the course material
    const deleted = await academicRepository.deleteCourseMaterial(materialId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Failed to delete course material" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course material deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course material:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete course material. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const materialId = id;

    // Get the course material — tenant-checked via parent course
    const courseMaterial =
      await academicRepository.getCourseMaterialById(materialId);

    if (
      !courseMaterial ||
      !(await materialInTenant(sessionOrError.user.id, courseMaterial.courseId))
    ) {
      return NextResponse.json(
        { success: false, message: "Course material not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: courseMaterial,
    });
  } catch (error) {
    console.error("Error fetching course material:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch course material",
      },
      { status: 500 },
    );
  }
}

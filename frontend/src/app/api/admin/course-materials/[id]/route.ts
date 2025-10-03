import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const materialId = params.id;

    // Check if the course material exists
    const existingMaterial = await academicRepository.getCourseMaterialById(materialId);
    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, message: "Course material not found" },
        { status: 404 }
      );
    }

    // Delete the course material
    const deleted = await academicRepository.deleteCourseMaterial(materialId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Failed to delete course material" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course material deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting course material:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete course material. Please try again." 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const materialId = params.id;

    // Get the course material
    const courseMaterial = await academicRepository.getCourseMaterialById(materialId);

    if (!courseMaterial) {
      return NextResponse.json(
        { success: false, message: "Course material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: courseMaterial
    });

  } catch (error) {
    console.error("Error fetching course material:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch course material" 
      },
      { status: 500 }
    );
  }
}
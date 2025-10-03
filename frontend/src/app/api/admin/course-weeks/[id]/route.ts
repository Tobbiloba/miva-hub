import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

const updateCourseWeekSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  learningObjectives: z.string().optional(),
  topics: z.string().optional(),
  isPublished: z.boolean().optional(),
  plannedStartDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid start date format"),
  plannedEndDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid end date format")
});

export async function PATCH(
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

    const weekId = params.id;
    const data = await request.json();
    
    // Validate request data
    const validatedData = updateCourseWeekSchema.parse(data);

    // Check if the course week exists
    const existingWeek = await academicRepository.getCourseWeekById(weekId);
    if (!existingWeek) {
      return NextResponse.json(
        { success: false, message: "Course week not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Parameters<typeof academicRepository.updateCourseWeek>[1] = {};
    
    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description || null;
    }
    if (validatedData.learningObjectives !== undefined) {
      updateData.learningObjectives = validatedData.learningObjectives || null;
    }
    if (validatedData.topics !== undefined) {
      updateData.topics = validatedData.topics || null;
    }
    if (validatedData.isPublished !== undefined) {
      updateData.isPublished = validatedData.isPublished;
    }
    if (validatedData.plannedStartDate !== undefined) {
      updateData.plannedStartDate = validatedData.plannedStartDate ? new Date(validatedData.plannedStartDate) : null;
    }
    if (validatedData.plannedEndDate !== undefined) {
      updateData.plannedEndDate = validatedData.plannedEndDate ? new Date(validatedData.plannedEndDate) : null;
    }

    // Update the course week
    const updatedWeek = await academicRepository.updateCourseWeek(weekId, updateData);

    if (!updatedWeek) {
      return NextResponse.json(
        { success: false, message: "Failed to update course week" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course week updated successfully",
      data: updatedWeek
    });

  } catch (error) {
    console.error("Error updating course week:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed",
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update course week. Please try again." 
      },
      { status: 500 }
    );
  }
}

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

    const weekId = params.id;

    // Check if the course week exists
    const existingWeek = await academicRepository.getCourseWeekById(weekId);
    if (!existingWeek) {
      return NextResponse.json(
        { success: false, message: "Course week not found" },
        { status: 404 }
      );
    }

    // Delete the course week
    const deleted = await academicRepository.deleteCourseWeek(weekId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Failed to delete course week" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course week deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting course week:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete course week. Please try again." 
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

    const weekId = params.id;

    // Get the course week
    const courseWeek = await academicRepository.getCourseWeekById(weekId);

    if (!courseWeek) {
      return NextResponse.json(
        { success: false, message: "Course week not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: courseWeek
    });

  } catch (error) {
    console.error("Error fetching course week:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch course week" 
      },
      { status: 500 }
    );
  }
}
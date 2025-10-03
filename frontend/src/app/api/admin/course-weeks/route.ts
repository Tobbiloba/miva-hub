import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { courseId, weekNumber, title, description, learningObjectives, topics } = data;

    // Validate required fields
    if (!courseId || !weekNumber || !title) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required fields: courseId, weekNumber, and title are required" 
        },
        { status: 400 }
      );
    }

    // Validate week number
    if (weekNumber < 1 || weekNumber > 52) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Week number must be between 1 and 52" 
        },
        { status: 400 }
      );
    }

    // Create the course week
    const courseWeek = await academicRepository.createCourseWeek({
      courseId,
      weekNumber,
      title: title.trim(),
      description: description?.trim() || null,
      learningObjectives: learningObjectives || null,
      topics: topics || null,
      isPublished: false, // Default to unpublished
      plannedStartDate: null, // Will be calculated later based on course dates
      plannedEndDate: null
    });

    return NextResponse.json({
      success: true,
      message: "Course week created successfully",
      data: courseWeek
    });

  } catch (error) {
    console.error("Error creating course week:", error);
    
    // Handle unique constraint violations (duplicate week numbers for same course)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { 
          success: false, 
          message: "A week with this number already exists for this course" 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create course week. Please try again." 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "courseId parameter is required" 
        },
        { status: 400 }
      );
    }

    // Get all weeks for the course
    const courseWeeks = await academicRepository.getCourseWeeks(courseId);

    return NextResponse.json({
      success: true,
      data: courseWeeks
    });

  } catch (error) {
    console.error("Error fetching course weeks:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch course weeks" 
      },
      { status: 500 }
    );
  }
}
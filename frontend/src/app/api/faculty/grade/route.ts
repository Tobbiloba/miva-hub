import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  grade: z.number().min(0).max(1000), // Allow up to 1000 points
  feedback: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const facultyInfo = getFacultyInfo(session);

    if (!facultyInfo) {
      return NextResponse.json(
        { error: "Faculty authentication required" },
        { status: 401 }
      );
    }

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
    
    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { submissionId, grade, feedback } = gradeSubmissionSchema.parse(body);

    // Verify faculty has access to this submission
    const submissionDetails = await pgAcademicRepository.getSubmissionDetails(
      submissionId, 
      facultyRecord.id
    );

    if (!submissionDetails) {
      return NextResponse.json(
        { error: "Submission not found or access denied" },
        { status: 404 }
      );
    }

    // Validate grade is within assignment limits
    const maxPoints = Number(submissionDetails.assignment.totalPoints);
    if (grade > maxPoints) {
      return NextResponse.json(
        { error: `Grade cannot exceed ${maxPoints} points` },
        { status: 400 }
      );
    }

    // Update the submission grade
    const updatedSubmission = await pgAcademicRepository.updateSubmissionGrade(
      submissionId,
      grade,
      feedback,
      facultyInfo.id
    );

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to update grade" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: "Grade submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting grade:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const facultyInfo = getFacultyInfo(session);

    if (!facultyInfo) {
      return NextResponse.json(
        { error: "Faculty authentication required" },
        { status: 401 }
      );
    }

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
    
    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const submissionId = url.searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId parameter required" },
        { status: 400 }
      );
    }

    // Get submission details
    const submissionDetails = await pgAcademicRepository.getSubmissionDetails(
      submissionId, 
      facultyRecord.id
    );

    if (!submissionDetails) {
      return NextResponse.json(
        { error: "Submission not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      submission: submissionDetails
    });

  } catch (error) {
    console.error("Error fetching submission:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
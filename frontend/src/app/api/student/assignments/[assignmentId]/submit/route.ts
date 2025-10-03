import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getStudentInfo } from "@/lib/auth/student";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AssignmentSubmissionSchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const session = await getSession();
    const studentInfo = getStudentInfo(session);

    if (!studentInfo) {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 }
      );
    }

    // Verify student has access to this assignment
    const upcomingAssignments = await pgAcademicRepository.getStudentUpcomingAssignments(studentInfo.id, 100);
    const assignmentData = upcomingAssignments.find(({ assignment }) => assignment.id === assignmentId);

    if (!assignmentData) {
      return NextResponse.json(
        { error: "Assignment not found or access denied" },
        { status: 404 }
      );
    }

    const { assignment, submission: existingSubmission } = assignmentData;

    // Check if already submitted
    if (existingSubmission) {
      return NextResponse.json(
        { error: "Assignment already submitted" },
        { status: 400 }
      );
    }

    // Check if submission is allowed
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const isOverdue = dueDate < now;

    if (isOverdue && !assignment.allowLateSubmission) {
      return NextResponse.json(
        { error: "Late submissions are not allowed for this assignment" },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const submissionText = formData.get("submissionText") as string;
    const submissionFile = formData.get("submissionFile") as File;

    // Validate submission based on assignment type
    const submissionType = assignment.submissionType || 'file_upload';
    
    if (submissionType === 'text_entry' || submissionType === 'online_test') {
      if (!submissionText || submissionText.trim().length === 0) {
        return NextResponse.json(
          { error: "Text submission is required for this assignment" },
          { status: 400 }
        );
      }
    }

    if (submissionType === 'file_upload') {
      if (!submissionFile || submissionFile.size === 0) {
        return NextResponse.json(
          { error: "File upload is required for this assignment" },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (submissionFile.size > maxFileSize) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
      ];

      if (!allowedTypes.includes(submissionFile.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Please upload PDF, DOC, DOCX, TXT, or ZIP files." },
          { status: 400 }
        );
      }
    }

    // Handle file upload if provided
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (submissionFile && submissionFile.size > 0) {
      // TODO: Implement actual file storage (e.g., AWS S3, local storage, etc.)
      // For now, we'll store file metadata but not the actual file
      fileName = submissionFile.name;
      fileSize = submissionFile.size;
      mimeType = submissionFile.type;
      
      // Placeholder URL - in production, this would be the actual file URL
      fileUrl = `/uploads/assignments/${assignmentId}/${studentInfo.id}/${fileName}`;
      
      // TODO: Save actual file to storage
      console.log('File to be saved:', {
        fileName,
        fileSize,
        mimeType,
        assignmentId: assignmentId,
        studentId: studentInfo.id
      });
    }

    // Create submission record
    const submissionData = {
      assignmentId: assignmentId,
      studentId: studentInfo.id,
      submissionText: submissionText || null,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      isLateSubmission: isOverdue,
      submittedAt: new Date(),
    };

    const newSubmission = await pgDb
      .insert(AssignmentSubmissionSchema)
      .values(submissionData)
      .returning();

    // Return success response
    return NextResponse.json({
      success: true,
      submission: newSubmission[0],
      message: isOverdue 
        ? "Late submission recorded successfully"
        : "Assignment submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting assignment:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid submission data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const session = await getSession();
    const studentInfo = getStudentInfo(session);

    if (!studentInfo) {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 }
      );
    }

    // Get existing submission if any
    const existingSubmission = await pgDb
      .select()
      .from(AssignmentSubmissionSchema)
      .where(and(
        eq(AssignmentSubmissionSchema.assignmentId, assignmentId),
        eq(AssignmentSubmissionSchema.studentId, studentInfo.id)
      ));

    return NextResponse.json({
      submission: existingSubmission[0] || null
    });

  } catch (error) {
    console.error("Error fetching submission:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
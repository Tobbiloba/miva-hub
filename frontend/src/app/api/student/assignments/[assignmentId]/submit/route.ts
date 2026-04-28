import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getStudentInfo } from "@/lib/auth/student";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AssignmentSubmissionSchema } from "@/lib/db/pg/schema.pg";
import { s3Service } from "@/lib/aws/s3-service";
import type { S3AccessOptions } from "@/lib/aws/s3-service";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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

    const { assignment, course, submission: existingSubmission } = assignmentData;

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

      // Validate file size (100MB limit — matches admin upload)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (submissionFile.size > maxFileSize) {
        return NextResponse.json(
          { error: "File size must be less than 100MB" },
          { status: 400 }
        );
      }

      // Validate file type (matches admin upload + student extras)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4',
        'video/quicktime',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-m4a',
        'audio/mp4',
        'application/zip',
        'application/x-zip-compressed',
        'image/jpeg',
        'image/png',
        'text/plain',
      ];

      if (!allowedTypes.includes(submissionFile.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: PDF, DOCX, PPTX, MP4, MOV, MP3, WAV, M4A, ZIP, JPG, PNG, TXT." },
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
      fileName = submissionFile.name;
      fileSize = submissionFile.size;
      mimeType = submissionFile.type;

      // Generate S3 key for submission file
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `submissions/${assignmentId}/${studentInfo.id}/${randomUUID()}-${sanitizedName}`;

      const accessOptions: S3AccessOptions = {
        userId: studentInfo.id,
        userRole: 'student',
        courseId: course.id,
      };

      const uploadResult = await s3Service.uploadFile(
        submissionFile,
        s3Key,
        accessOptions,
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          { error: "Failed to upload file. Please try again." },
          { status: 500 }
        );
      }

      // Store the S3 URL (same format used by admin content uploads)
      fileUrl = uploadResult.s3Url;
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
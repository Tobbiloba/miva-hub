import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { s3Service } from "@/lib/aws/s3-service";

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }
    const session = sessionOrError;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const materialType = formData.get('materialType') as string;
    const weekNumber = formData.get('weekNumber') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';

    if (!file || !courseId || !materialType || !weekNumber || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav',
      'audio/x-m4a'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 }
      );
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Get course and department information for S3 path generation
    const course = await pgAcademicRepository.getCourseById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const department = await pgAcademicRepository.getDepartmentById(course.departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Generate semester identifier (for now using current year and semester)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-indexed, so add 1
    const semester = currentMonth >= 8 || currentMonth <= 1 ? `${currentYear}-fall` : `${currentYear}-spring`;

    // Upload file to S3 with intelligent path structure
    const s3UploadOptions = {
      courseId: course.id,
      courseDepartment: department.code.toLowerCase(),
      courseCode: course.courseCode.toLowerCase(),
      semester: semester,
      weekNumber: parseInt(weekNumber),
      materialType: materialType as any,
      uploadedBy: session.user.id,
      userRole: 'admin' as const
    };

    const s3Key = s3Service.generateS3Key(s3UploadOptions, file.name);
    console.log(`Uploading file to S3: ${s3Key}`);

    // Upload to S3 with progress tracking
    const uploadResult = await s3Service.uploadFile(
      file,
      s3Key,
      {
        userId: session.user.id,
        userRole: 'admin',
        userEmail: session.user.email
      }
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload file to S3" },
        { status: 500 }
      );
    }

    // Insert material record into database with S3 information
    const materialData = {
      courseId,
      title,
      description,
      materialType: materialType as "syllabus" | "lecture" | "assignment" | "resource" | "reading" | "exam",
      weekNumber: parseInt(weekNumber),
      fileName: file.name,
      contentUrl: uploadResult.s3Url, // Store S3 URL instead of local path
      fileSize: file.size,
      mimeType: file.type,
      uploadedById: session.user.id,
    };

    const insertedMaterial = await pgAcademicRepository.insertCourseMaterial(materialData);
    console.log('Material saved to database:', insertedMaterial);

    // Generate public URL and update the material with CloudFront URL if available
    const publicUrl = `/api/files/${insertedMaterial.id}`;
    const cloudFrontUrl = uploadResult.cloudFrontUrl;
    
    await pgAcademicRepository.updateCourseMaterial(insertedMaterial.id, { 
      publicUrl,
      // Store CloudFront URL in a metadata field if your schema supports it
    });
    console.log('Public URL generated:', publicUrl);
    if (cloudFrontUrl) {
      console.log('CloudFront URL available:', cloudFrontUrl);
    }

    // Create AI processing job
    const processingJob = await pgAcademicRepository.createAIProcessingJob({
      courseMaterialId: insertedMaterial.id,
      jobType: getJobTypeFromFileType(file.type),
      status: "pending",
      metadata: {
        originalFilename: file.name,
        fileSize: file.size,
        uploadedBy: session.user.id,
        s3Key: s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET,
        cloudFrontUrl: cloudFrontUrl,
      },
    });

    // Trigger AI processing (async) with S3 information
    triggerContentProcessing(insertedMaterial.id, s3Key, file.type, processingJob.id)
      .catch(error => {
        console.error('Processing failed:', error);
        // Update job status to failed
        pgAcademicRepository.updateAIProcessingJobStatus(
          processingJob.id, 
          "failed", 
          undefined, 
          new Date(), 
          error.message
        );
      });

    return NextResponse.json({
      message: "File uploaded successfully to AWS S3",
      materialId: insertedMaterial.id,
      filename: file.name,
      s3Key: s3Key,
      s3Url: uploadResult.s3Url,
      cloudFrontUrl: cloudFrontUrl,
      publicUrl: publicUrl,
      processingJobId: processingJob.id,
      processingStatus: "pending"
    });

  } catch (error) {
    console.error("Error uploading content:", error);
    return NextResponse.json(
      { error: "Failed to upload content" },
      { status: 500 }
    );
  }
}

// Helper function to determine job type from file type
function getJobTypeFromFileType(fileType: string): "pdf_processing" | "video_transcription" | "interactive_parsing" | "text_analysis" {
  if (fileType === 'application/pdf') {
    return "pdf_processing";
  } else if (fileType.startsWith('video/')) {
    return "video_transcription";
  } else if (fileType.includes('word') || fileType.includes('presentation')) {
    return "interactive_parsing";
  } else {
    return "text_analysis";
  }
}

// Trigger AI content processing via FastAPI with S3 integration
async function triggerContentProcessing(
  materialId: string,
  s3Key: string, 
  fileType: string,
  processingJobId: string
): Promise<void> {
  try {
    // Update job status to processing
    await pgAcademicRepository.updateAIProcessingJobStatus(
      processingJobId,
      "processing",
      new Date()
    );

    const CONTENT_PROCESSOR_URL = process.env.CONTENT_PROCESSOR_URL || 'http://localhost:8082';
    
    // Prepare form data for the FastAPI endpoint with S3 information
    const formData = new FormData();
    formData.append('material_id', materialId);
    formData.append('s3_key', s3Key); // Use S3 key instead of file path
    formData.append('s3_bucket', process.env.AWS_S3_BUCKET || 'miva-university-content');
    formData.append('file_type', fileType);
    formData.append('processing_job_id', processingJobId);

    console.log(`Starting AI processing for material ${materialId} from S3: ${s3Key} via ${CONTENT_PROCESSOR_URL}/process-material`);

    // Call the FastAPI content processor using the new unified endpoint
    const response = await fetch(`${CONTENT_PROCESSOR_URL}/process-material`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Content processor returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('S3-based content processing initiated:', result);

    // The FastAPI processor will handle downloading from S3, processing,
    // and updating the job status and saving results via its own database operations
    
  } catch (error) {
    console.error('Failed to trigger S3-based content processing:', error);
    throw error;
  }
}
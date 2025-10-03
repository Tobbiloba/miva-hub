import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // Create upload directory if it doesn't exist - use absolute path accessible by FastAPI
    const uploadDir = join(process.cwd(), 'uploads', 'course-materials');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename with secure naming
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${originalName}`;
    const filepath = join(uploadDir, filename);

    console.log(`Saving file to: ${filepath}`);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Insert material record into database
    const materialData = {
      courseId,
      title,
      description,
      materialType: materialType as "syllabus" | "lecture" | "assignment" | "resource" | "reading" | "exam",
      weekNumber: parseInt(weekNumber),
      fileName: originalName,
      contentUrl: filepath, // Store file path in contentUrl
      fileSize: file.size,
      mimeType: file.type,
      uploadedById: session.user.id,
    };

    const insertedMaterial = await pgAcademicRepository.insertCourseMaterial(materialData);
    console.log('Material saved to database:', insertedMaterial);

    // Generate public URL and update the material
    const publicUrl = `/api/files/${insertedMaterial.id}`;
    await pgAcademicRepository.updateCourseMaterial(insertedMaterial.id, { publicUrl });
    console.log('Public URL generated:', publicUrl);

    // Create AI processing job
    const processingJob = await pgAcademicRepository.createAIProcessingJob({
      courseMaterialId: insertedMaterial.id,
      jobType: getJobTypeFromFileType(file.type),
      status: "pending",
      metadata: {
        originalFilename: originalName,
        fileSize: file.size,
        uploadedBy: session.user.id,
      },
    });

    // Trigger AI processing (async)
    triggerContentProcessing(insertedMaterial.id, filepath, file.type, processingJob.id)
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
      message: "File uploaded successfully",
      materialId: insertedMaterial.id,
      filename: originalName,
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

// Trigger AI content processing via FastAPI
async function triggerContentProcessing(
  materialId: string,
  filepath: string, 
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
    
    // Prepare form data for the FastAPI endpoint - using new unified endpoint
    const formData = new FormData();
    formData.append('material_id', materialId);
    formData.append('file_path', filepath);
    formData.append('processing_job_id', processingJobId);

    console.log(`Starting AI processing for material ${materialId} via ${CONTENT_PROCESSOR_URL}/process-material`);

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
    console.log('Content processing initiated:', result);

    // The FastAPI processor will handle updating the job status and saving results
    // via its own database operations
    
  } catch (error) {
    console.error('Failed to trigger content processing:', error);
    throw error;
  }
}
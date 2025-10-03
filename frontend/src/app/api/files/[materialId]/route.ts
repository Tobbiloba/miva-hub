import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface Params {
  materialId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { materialId } = params;

    // Validate materialId format
    if (!materialId || materialId.length < 10) {
      return NextResponse.json(
        { error: "Invalid material ID" },
        { status: 400 }
      );
    }

    // Get user session for authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get material information from database
    const material = await pgAcademicRepository.getCourseMaterialById(materialId);
    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this material
    const hasAccess = await checkUserAccess(session.user.id, session.user.email, material.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get file path (handle both legacy filePath and new contentUrl)
    const filePath = material.filePath || material.contentUrl;
    if (!filePath) {
      return NextResponse.json(
        { error: "File path not found" },
        { status: 404 }
      );
    }

    // Ensure file exists
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }

    // Get file stats
    const fileStats = await stat(filePath);
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = getContentType(material.fileType || material.mimeType, material.fileName);

    // Handle range requests for video streaming
    const range = request.headers.get('range');
    if (range && contentType.startsWith('video/')) {
      return handleRangeRequest(fileBuffer, range, contentType, fileStats.size);
    }

    // Return file with appropriate headers
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Length', fileStats.size.toString());
    response.headers.set('Content-Disposition', `inline; filename="${material.fileName}"`);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    response.headers.set('ETag', `"${fileStats.mtime.getTime()}"`);
    
    // Add CORS headers for cross-origin requests
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');

    return response;

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if user has access to the course material
 */
async function checkUserAccess(userId: string, userEmail: string | null, courseId: string): Promise<boolean> {
  try {
    // Admin users have access to all materials
    if (userEmail?.endsWith('@miva.edu.ng')) {
      // For MIVA students, check if they're enrolled in the course
      const enrollment = await pgAcademicRepository.getStudentEnrollment(userId, courseId);
      return !!enrollment;
    }
    
    // For other users, check if they're the uploader or have admin privileges
    // This can be expanded based on your access control requirements
    return false;
  } catch (error) {
    console.error("Error checking user access:", error);
    return false;
  }
}

/**
 * Get appropriate content type for file
 */
function getContentType(mimeType: string | null, fileName: string | null): string {
  if (mimeType) {
    return mimeType;
  }

  // Fallback based on file extension
  if (!fileName) return 'application/octet-stream';

  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/x-m4a',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Handle HTTP range requests for video streaming
 */
function handleRangeRequest(
  fileBuffer: Buffer, 
  range: string, 
  contentType: string, 
  fileSize: number
): NextResponse {
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = (end - start) + 1;
  const chunk = fileBuffer.slice(start, end + 1);

  const response = new NextResponse(chunk, { status: 206 });
  response.headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  response.headers.set('Accept-Ranges', 'bytes');
  response.headers.set('Content-Length', chunkSize.toString());
  response.headers.set('Content-Type', contentType);

  return response;
}
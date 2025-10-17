import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { s3Service } from "@/lib/aws/s3-service";

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
    const userRole = await getUserRole(session.user.email);
    const hasAccess = await checkUserAccess(session.user.id, session.user.email, material.courseId, userRole);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Extract S3 key from contentUrl (handle both S3 URLs and legacy local paths)
    const s3Key = extractS3KeyFromUrl(material.contentUrl);
    if (!s3Key) {
      // Fallback for legacy local files - this should be migrated to S3
      return NextResponse.json(
        { error: "File not available - migration to S3 required" },
        { status: 404 }
      );
    }

    try {
      // Check if CloudFront URL is available for faster delivery
      const cloudFrontUrl = s3Service.getCloudFrontUrl(s3Key);
      
      if (cloudFrontUrl) {
        // Use CloudFront for 60-80% faster delivery
        console.log(`Serving file via CloudFront: ${cloudFrontUrl}`);
        return NextResponse.redirect(cloudFrontUrl);
      } else {
        // Generate secure presigned URL for direct S3 access
        const presignedUrl = await s3Service.generateDownloadUrl(s3Key, {
          userId: session.user.id,
          userRole: userRole,
          userEmail: session.user.email,
          courseId: material.courseId
        });

        console.log(`Serving file via S3 presigned URL: ${s3Key}`);
        
        // Redirect to secure S3 URL with appropriate expiration
        return NextResponse.redirect(presignedUrl);
      }
    } catch (error) {
      console.error(`Error generating secure URL for file ${s3Key}:`, error);
      return NextResponse.json(
        { error: "Failed to generate secure file access" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get user role based on email and database lookup
 */
async function getUserRole(userEmail: string | null): Promise<'student' | 'faculty' | 'admin'> {
  if (!userEmail) return 'student';
  
  // Admin check - hardcoded admin email
  if (userEmail === 'oluwatobi.salau@miva.edu.ng') {
    return 'admin';
  }
  
  // Faculty check - look up in faculty table
  try {
    const faculty = await pgAcademicRepository.getFacultyByEmail(userEmail);
    if (faculty) {
      return 'faculty';
    }
  } catch (error) {
    console.log('Error checking faculty status:', error);
  }
  
  // Default to student for MIVA emails
  return 'student';
}

/**
 * Extract S3 key from contentUrl (handles S3 URLs and legacy paths)
 */
function extractS3KeyFromUrl(contentUrl: string | null): string | null {
  if (!contentUrl) return null;
  
  // Handle S3 URLs (s3://bucket/key)
  if (contentUrl.startsWith('s3://')) {
    const parts = contentUrl.replace('s3://', '').split('/');
    if (parts.length > 1) {
      return parts.slice(1).join('/'); // Remove bucket name, keep key
    }
  }
  
  // Handle HTTPS S3 URLs (https://bucket.s3.region.amazonaws.com/key)
  if (contentUrl.includes('.s3.') && contentUrl.includes('.amazonaws.com/')) {
    const keyPart = contentUrl.split('.amazonaws.com/')[1];
    if (keyPart) {
      return keyPart;
    }
  }
  
  // Handle local file paths (legacy) - return null to indicate migration needed
  if (contentUrl.includes('/uploads/') || contentUrl.startsWith('/')) {
    return null;
  }
  
  // If it looks like a direct S3 key, return as-is
  if (contentUrl.startsWith('courses/')) {
    return contentUrl;
  }
  
  return null;
}

/**
 * Check if user has access to the course material with FERPA compliance
 */
async function checkUserAccess(
  userId: string, 
  userEmail: string | null, 
  courseId: string, 
  userRole: 'student' | 'faculty' | 'admin'
): Promise<boolean> {
  try {
    // Admin users have access to all materials
    if (userRole === 'admin') {
      return true;
    }
    
    // Faculty users have access to courses they teach
    if (userRole === 'faculty' && userEmail) {
      // Check if faculty is assigned to teach this course
      const faculty = await pgAcademicRepository.getFacultyByEmail(userEmail);
      if (faculty) {
        // TODO: Check course instructor assignments
        // For now, allow faculty access to all courses
        return true;
      }
    }
    
    // Students can only access courses they're enrolled in (FERPA compliance)
    if (userRole === 'student' && userEmail?.endsWith('@miva.edu.ng')) {
      const enrollment = await pgAcademicRepository.getStudentEnrollment(userId, courseId);
      return !!enrollment;
    }
    
    // Deny access by default
    return false;
  } catch (error) {
    console.error("Error checking user access:", error);
    return false;
  }
}

// Note: Content type handling and range requests are now handled by CloudFront/S3
// This provides better performance and scalability for video streaming and file delivery
import { getApiSession } from "@/lib/auth/server";
import { s3Service } from "lib/aws/s3-service";
import { authorizeStorageUrl } from "lib/material-access";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_BUCKET = process.env.AWS_S3_BUCKET || "miva-university-content";

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const s3Url = searchParams.get("url");

    if (!s3Url) {
      return NextResponse.json(
        { error: "URL parameter required" },
        { status: 400 },
      );
    }

    // Resolve the object to its course_material row and apply the same
    // access rule as /api/files/[materialId] (enrollment / instructor /
    // same-tenant admin). Unknown objects are never signed.
    const access = await authorizeStorageUrl(
      session.user.id,
      s3Url,
      ALLOWED_BUCKET,
    );
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }
    const { bucket, key } = access;

    try {
      // Get signed URL for download
      const signedUrl = await s3Service.getSignedUrl(bucket, key, 3600);

      // Extract filename from key (last part after last slash)
      const filename = key.split("/").pop() || "download";

      // Fetch file from S3
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from S3: ${response.status}`);
      }

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      // Create headers for download
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      });

      // Add content length if available
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      return new NextResponse(response.body, {
        status: 200,
        headers,
      });
    } catch (fetchError) {
      console.error("Error downloading from S3:", fetchError);
      return NextResponse.json(
        { error: "Failed to download file from storage" },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

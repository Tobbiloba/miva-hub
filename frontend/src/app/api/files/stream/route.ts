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
      const signedUrl = await s3Service.getSignedUrl(bucket, key, 7200);

      return NextResponse.redirect(signedUrl, 307);
    } catch (fetchError) {
      console.error("Error fetching from S3:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("File streaming error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

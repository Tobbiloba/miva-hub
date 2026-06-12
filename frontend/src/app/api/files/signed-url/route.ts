import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { s3Service } from 'lib/aws/s3-service';

const ALLOWED_BUCKET = process.env.AWS_S3_BUCKET || 'miva-university-content';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const s3Url = searchParams.get('url');

    if (!s3Url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    const urlMatch = s3Url.match(/s3:\/\/([^\/]+)\/(.+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 });
    }

    const [, bucket, key] = urlMatch;

    // Only sign URLs for the app's own content bucket
    if (bucket !== ALLOWED_BUCKET) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
      const signedUrl = await s3Service.getSignedUrl(bucket, key, 7200);

      return NextResponse.json({
        signedUrl,
        expiresIn: 7200
      });

    } catch (error) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('Signed URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from 'lib/aws/s3-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Url = searchParams.get('url');
    
    if (!s3Url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    // Extract bucket and key from S3 URL
    const urlMatch = s3Url.match(/s3:\/\/([^\/]+)\/(.+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 });
    }

    const [, bucket, key] = urlMatch;
    
    try {
      const signedUrl = await s3Service.getSignedUrl(bucket, key, 7200);
      
      return NextResponse.redirect(signedUrl, 307);
      
    } catch (fetchError) {
      console.error('Error fetching from S3:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch file from storage' }, 
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error('File streaming error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
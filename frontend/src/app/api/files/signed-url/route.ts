import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from 'lib/aws/s3-service';

export async function GET(request: NextRequest) {
  try {
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

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
      // Get signed URL for download
      const signedUrl = await s3Service.getSignedUrl(bucket, key, 3600);
      
      // Get file metadata for proper filename
      const metadata = await s3Service.getFileMetadata(bucket, key);
      
      // Extract filename from key (last part after last slash)
      const filename = key.split('/').pop() || 'download';
      
      // Fetch file from S3
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from S3: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Create headers for download
      const headers = new Headers({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      });
      
      // Add content length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      return new NextResponse(response.body, {
        status: 200,
        headers,
      });
      
    } catch (fetchError) {
      console.error('Error downloading from S3:', fetchError);
      return NextResponse.json(
        { error: 'Failed to download file from storage' }, 
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
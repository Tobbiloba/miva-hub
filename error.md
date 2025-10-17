event: status_update
data: {"status": "pending", "message": "Waiting for processing to start", "timestamp": "2025-10-06T11:09:06.921994"}

: ping - 2025-10-06 10:09:21.926501+00:00

event: heartbeat
data: {"timestamp": "2025-10-06T11:09:36.928790"}

: ping - 2025-10-06 10:09:36.929064+00:00

: ping - 2025-10-06 10:09:51.930896+00:00

event: heartbeat
data: {"timestamp": "2025-10-06T11:10:06.932174"}

: ping - 2025-10-06 10:10:06.941461+00:00

: ping - 2025-10-06 10:10:21.943163+00:00

event: heartbeat
data: {"timestamp": "2025-10-06T11:10:36.934532"}

: ping - 2025-10-06 10:10:36.945229+00:00

Ready to upload files!

Processing Pipeline Status
Upload Phase
✓ Complete
AI Processing
1 in progress
Vector Embedding
Pending
Knowledge Base
Pending


 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 1161ms
Uploading file to S3: courses/math/math 202/2025-fall/week-01/resource/1759745341341_new_document.pdf
FERPA_AUDIT_LOG: {"timestamp":"2025-10-06T10:09:06.859Z","eventType":"FILE_UPLOADED","service":"S3Service","bucket":"miva-university-content","region":"us-east-1","s3Key":"courses/math/math 202/2025-fall/week-01/resource/1759745341341_new_document.pdf","fileName":"new_document.pdf","fileSize":78111,"userId":"7da6e3a7-d313-41f1-a87a-cfd52fb76455","userRole":"admin"}
Material saved to database: {
  id: 'f5eb976f-ef57-4165-8bc7-c92fad5bca3d',
  courseId: 'c9f62ef8-cba7-42e7-a523-b930f9d4ccf4',
  materialType: 'resource',
  title: 'testtt',
  description: '',
  contentUrl: 's3://miva-university-content/courses/math/math 202/2025-fall/week-01/resource/1759745341341_new_document.pdf',
  publicUrl: null,
  fileName: 'new_document.pdf',
  fileSize: 78111,
  mimeType: 'application/pdf',
  weekNumber: 1,
  moduleNumber: null,
  isPublic: true,
  uploadedById: '7da6e3a7-d313-41f1-a87a-cfd52fb76455',
  createdAt: 2025-10-06T03:09:06.862Z,
  updatedAt: 2025-10-06T03:09:06.862Z
}
Public URL generated: /api/files/f5eb976f-ef57-4165-8bc7-c92fad5bca3d
CloudFront URL available: https://your_cloudfront_domain.cloudfront.net/courses/math/math 202/2025-fall/week-01/resource/1759745341341_new_document.pdf
 POST /api/content/upload 200 in 5601ms
Starting AI processing for material f5eb976f-ef57-4165-8bc7-c92fad5bca3d from S3: courses/math/math 202/2025-fall/week-01/resource/1759745341341_new_document.pdf via http://localhost:8082/process-material
S3-based content processing initiated: {
  status: 'completed',
  message: 'Material processed successfully',
  material_id: 'f5eb976f-ef57-4165-8bc7-c92fad5bca3d',
  processing_job_id: '8c7b7b63-d57a-4fc2-acf4-02c04411819d',
  material_title: 'testtt',
  processing_result: {
    extracted_text: '=== PDF DOCUMENT ANALYSIS ===\n' +
      'Title: \n' +
      'Author: \n' +
      'Pages: 1\n' +
      "Creation Date: D:20220404135153+02'00'\n" +
      '\n' +
      '=== DOCUMENT CONTENT ===',
    ai_summary: 'Based on the provided content, here is the extracted information:\n' +
      '\n' +
      'TOPICS: PDF Document Analysis, Document Content, Title, Author, Creation Date\n' +
      '\n' +
      'OBJECTIVES:\n' +
      '1. Understand the structure and format of a PDF document.\n' +
      '2. Learn how to analyze and extract metadata from a PDF file.\n' +
      '3. Familiarize yourself with basic PDF document features.\n' +
      '\n' +
      'DIFFICULTY: Beginner\n' +
      '\n' +
      'SUMMARY: This educational content provides an overview of analyzing a PDF document, covering its title, author, pages, and creation date. The document also includes a brief analysis of the content, suggesting that it may serve as a primer for those new to PDF document analysis.',
    key_concepts: [ 'Title', 'Author', 'Pages', 'Creation Date' ],
    embeddings_count: 768,
    ai_processed_id: 'be88f11d-36f2-4771-9c39-af7b480a20a1',
    status: 'completed'
  }
}

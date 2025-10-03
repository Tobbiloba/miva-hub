# Upload-to-Processing Integration Test Plan

## ✅ **Implementation Complete**

All components have been successfully integrated:

### **✅ Frontend Components Fixed**
- Fixed import paths in upload page, course selector, and file upload zone
- Components now use correct `@/components/ui/*` imports

### **✅ Database Schema Extended** 
- Added AI processing tables: `ai_processing_job`, `ai_processed_content`, `content_embedding`
- Added proper relationships and indexes
- Extended academic repository with AI processing operations

### **✅ Upload API Enhanced**
- Enabled database operations (saves to `course_material` table)
- Creates AI processing jobs
- Calls FastAPI content processor
- Proper error handling and status tracking

### **✅ Processing Status Tracking**
- Created processing status API endpoints
- Built admin processing dashboard at `/admin/processing`
- Real-time job monitoring with auto-refresh
- Integrated into admin sidebar

## 🧪 **Testing Requirements**

### **Prerequisites**
1. **Database Setup**
   ```bash
   # Run database migrations to create new AI processing tables
   npm run db:migrate
   # or manually run the schema updates
   ```

2. **FastAPI Content Processor**
   ```bash
   # Start the content processor server
   cd mcp-server
   python -m uvicorn src.api.enhanced_content_processor_api:app --host 0.0.0.0 --port 8082 --reload
   ```

3. **Environment Variables**
   ```bash
   # Add to .env.local
   CONTENT_PROCESSOR_URL=http://localhost:8082
   ```

4. **Ollama Models**
   ```bash
   # Ensure required models are available
   ollama pull llama3.2:3b
   ollama pull nomic-embed-text
   ```

### **Test Flow**

#### **1. Upload Test**
1. Navigate to `/admin/content/upload`
2. Select a course from dropdown
3. Choose a PDF file (test with: lecture notes, assignment, etc.)
4. Fill in metadata (title, description, week number, material type)
5. Click upload

**Expected Results:**
- File saves to filesystem (`uploads/course-materials/`)
- Database record created in `course_material` table
- AI processing job created with "pending" status
- Returns material ID and processing job ID

#### **2. Processing Monitoring**
1. Navigate to `/admin/processing`
2. Verify new job appears in the table
3. Watch status progression: `pending` → `processing` → `completed`
4. Check job statistics in the dashboard

**Expected Results:**
- Job appears immediately after upload
- Status updates automatically (refresh every 30s)
- Processing duration is tracked
- Error messages shown if processing fails

#### **3. FastAPI Processing Verification**
1. Check FastAPI server logs for processing activity
2. Verify AI analysis is performed (text extraction, summarization, embeddings)
3. Check database for processed content and embeddings

**Expected Results:**
- FastAPI receives and processes file
- `ai_processed_content` table gets new record
- `content_embedding` table gets chunk embeddings
- Job status updated to "completed"

#### **4. Error Handling Test**
1. Upload with FastAPI server stopped
2. Upload invalid file type
3. Upload to non-existent course

**Expected Results:**
- Appropriate error messages
- Job status set to "failed" with error details
- System remains stable

## 🔧 **Architecture Verification**

### **Data Flow Confirmed:**
```
Frontend Upload Form
    ↓
Next.js Upload API (/api/content/upload)
    ↓
Database: course_material + ai_processing_job records
    ↓
FastAPI Content Processor (http://localhost:8082/process-content)
    ↓ 
AI Processing: Text extraction, summarization, embeddings
    ↓
Database: ai_processed_content + content_embedding records
    ↓
Status Dashboard (/admin/processing) shows completion
```

### **Key Integration Points:**
- ✅ File validation and storage
- ✅ Database operations with proper relationships
- ✅ HTTP communication with FastAPI processor
- ✅ Async processing with status tracking
- ✅ Error handling and recovery
- ✅ Real-time monitoring interface

## 🎯 **Success Criteria**

### **Upload Success:**
- [ ] File uploaded and saved
- [ ] Database records created
- [ ] Processing job initiated
- [ ] User receives confirmation

### **Processing Success:**
- [ ] FastAPI receives file
- [ ] AI analysis completes
- [ ] Content and embeddings saved
- [ ] Status updated to completed

### **Monitoring Success:**
- [ ] Dashboard shows real-time status
- [ ] Statistics update correctly
- [ ] Error messages are clear
- [ ] Performance is acceptable

## 🚀 **Next Steps After Testing**

1. **Production Deployment**
   - Set up persistent file storage (S3/similar)
   - Configure production FastAPI server
   - Set up proper monitoring and alerting

2. **Feature Enhancements**
   - Add search functionality using embeddings
   - Integrate with MCP tools for chat-based content queries
   - Add bulk upload capabilities
   - Implement content versioning

3. **Performance Optimization**
   - Queue system for large files
   - Parallel processing capabilities
   - Caching for frequently accessed content

## 📋 **Troubleshooting Guide**

### **Common Issues:**
- **Database connection errors**: Check connection string and migrations
- **FastAPI not responding**: Verify server is running on port 8082
- **Processing timeouts**: Check Ollama models are downloaded
- **File upload failures**: Verify upload directory permissions

The complete upload-to-processing pipeline is now ready for testing! 🎉
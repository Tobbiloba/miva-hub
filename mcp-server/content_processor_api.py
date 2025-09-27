#!/usr/bin/env python3
"""
MIVA University Content Processing API
FastAPI service for handling content upload and AI processing
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
import asyncio
import tempfile
import mimetypes
from pathlib import Path
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime
import logging

# Database and AI imports
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from ai_integration import MIVAAIStack

# PDF processing
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

# Audio/Video processing
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MIVA University Content Processor",
    description="AI-powered content processing service for educational materials",
    version="1.0.0"
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global AI stack instance
ai_stack = None

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'miva_academic'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'cursor_factory': RealDictCursor
}

# Supported file types
SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'text/plain': 'text',
    'video/mp4': 'video',
    'video/avi': 'video',
    'video/mov': 'video',
    'audio/mp3': 'audio',
    'audio/wav': 'audio',
    'audio/m4a': 'audio',
    'image/jpeg': 'image',
    'image/png': 'image',
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit

class ProcessingStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# Database utilities
def get_db_connection():
    """Get database connection"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

async def get_ai_stack():
    """Get AI stack instance"""
    global ai_stack
    if ai_stack is None:
        ai_stack = MIVAAIStack()
        if not await ai_stack.test_connection():
            raise HTTPException(status_code=503, detail="AI services unavailable")
    return ai_stack

# Content processors
class ContentProcessor:
    """Base content processor"""
    
    @staticmethod
    def create_content_chunks(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        """Create overlapping text chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if len(chunk.strip()) > 50:
                chunks.append(chunk)
        
        return chunks

class PDFProcessor(ContentProcessor):
    """PDF content processor"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from PDF"""
        if not PDF_AVAILABLE:
            raise HTTPException(status_code=500, detail="PDF processing not available")
        
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise HTTPException(status_code=500, detail="PDF text extraction failed")

class AudioVideoProcessor(ContentProcessor):
    """Audio/Video content processor using Whisper"""
    
    @staticmethod
    async def extract_transcript(file_path: str) -> str:
        """Extract transcript from audio/video"""
        if not WHISPER_AVAILABLE:
            # Fallback: return placeholder transcript
            return f"Transcript extraction not available. Audio/video content uploaded from {file_path}"
        
        try:
            # Use base Whisper model for speed on M1
            model = whisper.load_model("base")
            result = model.transcribe(file_path)
            return result["text"]
        except Exception as e:
            logger.error(f"Transcript extraction failed: {e}")
            # Return placeholder instead of failing
            return f"Transcript extraction failed. Audio/video content from {file_path}"

class TextProcessor(ContentProcessor):
    """Plain text processor"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise HTTPException(status_code=500, detail="Text extraction failed")

# API endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 MIVA Content Processor starting up...")
    
    # Test database connection
    try:
        conn = get_db_connection()
        conn.close()
        logger.info("✅ Database connection verified")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    
    # Test AI stack
    try:
        stack = await get_ai_stack()
        logger.info("✅ AI stack initialized")
    except Exception as e:
        logger.error(f"❌ AI stack initialization failed: {e}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "MIVA University Content Processor",
        "version": "1.0.0",
        "status": "running",
        "ai_available": ai_stack is not None,
        "pdf_processing": PDF_AVAILABLE,
        "whisper_processing": WHISPER_AVAILABLE
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test database
        conn = get_db_connection()
        conn.close()
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    try:
        # Test AI stack
        stack = await get_ai_stack()
        ai_status = "healthy"
    except Exception:
        ai_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" and ai_status == "healthy" else "degraded",
        "database": db_status,
        "ai_stack": ai_status,
        "processors": {
            "pdf": PDF_AVAILABLE,
            "audio_video": WHISPER_AVAILABLE,
            "text": True
        }
    }

@app.post("/process-content")
async def process_content(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: Optional[int] = None,
    week_number: Optional[int] = None,
    title: Optional[str] = None,
    material_type: Optional[str] = None
):
    """
    Process uploaded content with AI
    """
    # Validate file
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    
    # Determine content type
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
    if content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {content_type}"
        )
    
    file_type = SUPPORTED_MIME_TYPES[content_type]
    
    # Generate unique processing ID
    processing_id = str(uuid.uuid4())
    
    # Save uploaded file temporarily
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, f"{processing_id}_{file.filename}")
    
    try:
        with open(temp_file_path, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)
        
        # Create database record first
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # If course_id provided, store in course_materials, otherwise create temp entry
        if course_id:
            cursor.execute("""
                INSERT INTO course_materials 
                (course_id, title, material_type, week_number, file_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                course_id,
                title or file.filename,
                material_type or file_type,
                week_number,
                temp_file_path,
                datetime.now()
            ))
            material_id = cursor.fetchone()['id']
        else:
            # Create temporary entry for processing
            cursor.execute("""
                INSERT INTO course_materials 
                (course_id, title, material_type, week_number, file_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                1,  # Default to first course for temp processing
                title or file.filename,
                material_type or file_type,
                week_number or 1,
                temp_file_path,
                datetime.now()
            ))
            material_id = cursor.fetchone()['id']
        
        # Map file types to valid job types
        job_type_mapping = {
            'pdf': 'pdf_processing',
            'video': 'video_transcription', 
            'audio': 'video_transcription',
            'text': 'pdf_processing',  # Use pdf_processing for text files
            'interactive': 'interactive_parsing'
        }
        job_type = job_type_mapping.get(file_type, 'pdf_processing')
        
        # Create processing job
        cursor.execute("""
            INSERT INTO ai_processing_jobs 
            (course_material_id, job_type, status, created_at, job_config)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            material_id,
            job_type,
            ProcessingStatus.PENDING,
            datetime.now(),
            json.dumps({
                "original_filename": file.filename,
                "content_type": content_type,
                "processing_id": processing_id,
                "temp_file_path": temp_file_path
            })
        ))
        job_id = cursor.fetchone()['id']
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Start background processing
        background_tasks.add_task(
            process_content_background,
            material_id,
            job_id,
            temp_file_path,
            file_type,
            processing_id
        )
        
        return {
            "processing_id": processing_id,
            "material_id": material_id,
            "job_id": job_id,
            "status": ProcessingStatus.PENDING,
            "file_type": file_type,
            "message": "Content uploaded successfully. Processing started."
        }
        
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        logger.error(f"Content processing setup failed: {e}")
        raise HTTPException(status_code=500, detail="Content processing setup failed")

async def process_content_background(
    material_id: int,
    job_id: int,
    file_path: str,
    file_type: str,
    processing_id: str
):
    """Background task for content processing"""
    try:
        # Update job status
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE ai_processing_jobs 
            SET status = %s, started_at = %s
            WHERE id = %s
        """, (ProcessingStatus.PROCESSING, datetime.now(), job_id))
        conn.commit()
        
        # Extract content based on file type
        if file_type == 'pdf':
            extracted_text = await PDFProcessor.extract_text(file_path)
        elif file_type in ['audio', 'video']:
            extracted_text = await AudioVideoProcessor.extract_transcript(file_path)
        elif file_type == 'text':
            extracted_text = await TextProcessor.extract_text(file_path)
        else:
            extracted_text = f"Processed content from {os.path.basename(file_path)}"
        
        # Get AI stack and process content
        stack = await get_ai_stack()
        
        # Generate AI analysis
        analysis_result = await stack.analyze_content(extracted_text, file_type)
        
        if not analysis_result['success']:
            raise Exception(f"AI analysis failed: {analysis_result['error']}")
        
        # Generate embeddings
        chunks = ContentProcessor.create_content_chunks(extracted_text)
        embeddings = []
        
        for chunk in chunks:
            emb_result = await stack.generate_embeddings(chunk)
            if emb_result['success']:
                embeddings.append(emb_result['embedding'])
            else:
                logger.warning(f"Embedding generation failed for chunk: {emb_result['error']}")
        
        # Parse AI analysis
        parsed = analysis_result.get('parsed', {})
        
        # Store processed content
        cursor.execute("""
            INSERT INTO ai_processed_content 
            (course_material_id, processing_status, extracted_text, ai_summary, 
             key_concepts, learning_objectives, difficulty_level, word_count,
             estimated_reading_time, ai_model_used, embedding_model_used,
             processing_completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            material_id,
            ProcessingStatus.COMPLETED,
            extracted_text,
            parsed.get('summary', analysis_result['response'][:500]),
            parsed.get('topics', []),
            parsed.get('objectives', []),
            parsed.get('difficulty', 'intermediate'),
            len(extracted_text.split()),
            max(1, len(extracted_text.split()) // 200),
            'llama3.2:3b',
            'nomic-embed-text',
            datetime.now()
        ))
        
        ai_content_id = cursor.fetchone()['id']
        
        # Store embeddings
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            cursor.execute("""
                INSERT INTO content_embeddings 
                (course_material_id, ai_processed_id, chunk_text, chunk_index, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                material_id,
                ai_content_id,
                chunk,
                i,
                embedding,
                json.dumps({
                    'processing_id': processing_id,
                    'file_type': file_type,
                    'chunk_size': len(chunk.split())
                })
            ))
        
        # Update job status
        cursor.execute("""
            UPDATE ai_processing_jobs 
            SET status = %s, completed_at = %s, progress = %s
            WHERE id = %s
        """, (ProcessingStatus.COMPLETED, datetime.now(), 100, job_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Successfully processed content: {processing_id}")
        
    except Exception as e:
        logger.error(f"❌ Background processing failed: {e}")
        
        # Update job status to failed
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE ai_processing_jobs 
                SET status = %s, failed_at = %s, error_message = %s
                WHERE id = %s
            """, (ProcessingStatus.FAILED, datetime.now(), str(e), job_id))
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")
    
    finally:
        # Clean up temporary file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                # Also remove temp directory if empty
                temp_dir = os.path.dirname(file_path)
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
        except Exception as cleanup_error:
            logger.warning(f"Cleanup failed: {cleanup_error}")

@app.get("/processing-status/{processing_id}")
async def get_processing_status(processing_id: str):
    """Get processing status by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                aj.*,
                cm.title as material_title,
                apc.id as ai_processed_id,
                COUNT(ce.id) as embedding_count
            FROM ai_processing_jobs aj
            JOIN course_materials cm ON aj.course_material_id = cm.id
            LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
            LEFT JOIN content_embeddings ce ON cm.id = ce.course_material_id
            WHERE aj.job_config->>'processing_id' = %s
            GROUP BY aj.id, cm.id, apc.id
        """, (processing_id,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        return {
            "processing_id": processing_id,
            "job_id": result['id'],
            "material_id": result['course_material_id'],
            "material_title": result['material_title'],
            "status": result['status'],
            "progress": result['progress'] or 0,
            "error_message": result['error_message'],
            "ai_processed": result['ai_processed_id'] is not None,
            "embedding_count": result['embedding_count'] or 0,
            "created_at": result['created_at'].isoformat() if result['created_at'] else None,
            "started_at": result['started_at'].isoformat() if result['started_at'] else None,
            "completed_at": result['completed_at'].isoformat() if result['completed_at'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")

@app.post("/search")
async def semantic_search(
    query: str,
    course_filter: Optional[str] = None,
    similarity_threshold: float = 0.3,
    limit: int = 10
):
    """Perform semantic search on processed content"""
    try:
        stack = await get_ai_stack()
        
        # Generate query embedding
        query_result = await stack.generate_embeddings(query)
        if not query_result['success']:
            raise HTTPException(status_code=500, detail="Query embedding generation failed")
        
        # Search database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM semantic_search(%s::vector, %s, %s, %s)
        """, (query_result['embedding'], course_filter, similarity_threshold, limit))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "query": query,
            "results": [dict(result) for result in results],
            "count": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@app.get("/courses/{course_code}/materials")
async def get_course_materials(course_code: str, processed_only: bool = False):
    """Get materials for a specific course"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if processed_only:
            cursor.execute("""
                SELECT cmw.*, c.course_code
                FROM course_materials_with_ai cmw
                JOIN courses c ON cmw.course_id = c.id
                WHERE c.course_code = %s AND cmw.ai_processed = true
                ORDER BY cmw.week_number, cmw.title
            """, (course_code,))
        else:
            cursor.execute("""
                SELECT cmw.*, c.course_code
                FROM course_materials_with_ai cmw
                JOIN courses c ON cmw.course_id = c.id
                WHERE c.course_code = %s
                ORDER BY cmw.week_number, cmw.title
            """, (course_code,))
        
        materials = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "course_code": course_code,
            "materials": [dict(material) for material in materials],
            "count": len(materials)
        }
        
    except Exception as e:
        logger.error(f"Failed to get course materials: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve course materials")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "content_processor_api:app",
        host="0.0.0.0",
        port=8081,
        reload=True,
        log_level="info"
    )
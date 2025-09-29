#!/usr/bin/env python3
"""
Enhanced MIVA University Content Processing API
FastAPI service with comprehensive error handling, validation, and monitoring
"""

import asyncio
import json
import logging
import mimetypes
import os
import re
import sys
import tempfile
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Enhanced imports
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.ai_integration import MIVAAIStack

# Utility functions
def secure_filename(filename: str) -> str:
    """Securely clean a filename to prevent path traversal attacks."""
    if not filename:
        return "upload"
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove dangerous characters, keep only alphanumeric, dots, hyphens, underscores
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Remove multiple consecutive dots/underscores
    filename = re.sub(r'[._-]{2,}', '_', filename)
    
    # Ensure it doesn't start with a dot
    filename = filename.lstrip('.')
    
    # Limit length
    if len(filename) > 100:
        name, ext = os.path.splitext(filename)
        filename = name[:90] + ext
    
    return filename or "upload"

# Document processing imports
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Load environment
load_dotenv()

# Enhanced logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('content_processor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Configuration
class Config:
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 100 * 1024 * 1024))  # 100MB
    MAX_FILES_PER_HOUR = int(os.getenv('MAX_FILES_PER_HOUR', 50))
    ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.docx', '.pptx', '.mp4', '.avi', '.mov', '.mp3', '.wav'}
    UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', 'uploads'))
    UPLOAD_DIR.mkdir(exist_ok=True)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'miva_academic'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'cursor_factory': RealDictCursor
}

# Custom Exception Classes
class ContentProcessingError(Exception):
    """Base exception for content processing errors"""
    def __init__(self, message: str, error_code: str = "PROCESSING_ERROR", details: Dict = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class FileValidationError(ContentProcessingError):
    """Exception for file validation errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "FILE_VALIDATION_ERROR", details)

class DatabaseError(ContentProcessingError):
    """Exception for database-related errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "DATABASE_ERROR", details)

class AIProcessingError(ContentProcessingError):
    """Exception for AI processing errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "AI_PROCESSING_ERROR", details)

# Database Helper Functions
def get_db_connection():
    """Get database connection with enhanced error handling"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise DatabaseError("Database service temporarily unavailable")

# Enhanced Content Processors

class EnhancedPDFProcessor:
    """Advanced PDF processor with metadata extraction and structure analysis"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.PDFProcessor")
    
    async def process_file(self, file_path: str) -> str:
        """Process PDF file with enhanced metadata and structure extraction"""
        try:
            self.logger.info(f"📄 Processing PDF: {file_path}")
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Extract metadata
                metadata = self._extract_metadata(pdf_reader)
                
                # Extract text with page information
                pages_content = []
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        pages_content.append({
                            'page': page_num + 1,
                            'content': page_text.strip()
                        })
                
                # Combine content with structure
                content_parts = [
                    "=== PDF DOCUMENT ANALYSIS ===",
                    f"Title: {metadata.get('title', 'Unknown')}",
                    f"Author: {metadata.get('author', 'Unknown')}",
                    f"Pages: {len(pdf_reader.pages)}",
                    f"Creation Date: {metadata.get('creation_date', 'Unknown')}",
                    "",
                    "=== DOCUMENT CONTENT ===",
                ]
                
                # Add page-by-page content
                for page_info in pages_content:
                    content_parts.append(f"\n--- Page {page_info['page']} ---")
                    content_parts.append(page_info['content'])
                
                full_content = '\n'.join(content_parts)
                
                self.logger.info(f"✅ PDF processed: {len(pages_content)} pages, {len(full_content)} characters")
                return full_content
                
        except Exception as e:
            self.logger.error(f"❌ PDF processing failed: {str(e)}")
            raise ContentProcessingError(f"PDF processing failed: {str(e)}")
    
    def _extract_metadata(self, pdf_reader) -> Dict[str, Any]:
        """Extract PDF metadata"""
        try:
            metadata = {}
            if pdf_reader.metadata:
                metadata['title'] = pdf_reader.metadata.get('/Title', '')
                metadata['author'] = pdf_reader.metadata.get('/Author', '')
                metadata['subject'] = pdf_reader.metadata.get('/Subject', '')
                metadata['creator'] = pdf_reader.metadata.get('/Creator', '')
                metadata['producer'] = pdf_reader.metadata.get('/Producer', '')
                
                # Handle creation date
                creation_date = pdf_reader.metadata.get('/CreationDate', '')
                if creation_date:
                    metadata['creation_date'] = str(creation_date)
                    
            return metadata
        except Exception as e:
            self.logger.warning(f"⚠️ Metadata extraction failed: {str(e)}")
            return {}

class EnhancedDOCXProcessor:
    """Advanced DOCX processor with styles, formatting, and structure analysis"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.DOCXProcessor")
    
    async def process_file(self, file_path: str) -> str:
        """Process DOCX file with enhanced structure and formatting extraction"""
        try:
            self.logger.info(f"📝 Processing DOCX: {file_path}")
            
            doc = docx.Document(file_path)
            
            # Extract document properties
            properties = self._extract_properties(doc)
            
            # Extract content with structure
            content_parts = [
                "=== DOCX DOCUMENT ANALYSIS ===",
                f"Title: {properties.get('title', 'Unknown')}",
                f"Author: {properties.get('author', 'Unknown')}",
                f"Paragraphs: {len(doc.paragraphs)}",
                f"Created: {properties.get('created', 'Unknown')}",
                "",
                "=== DOCUMENT STRUCTURE ===",
            ]
            
            # Process paragraphs with style information
            for i, paragraph in enumerate(doc.paragraphs):
                if paragraph.text.strip():
                    style_name = paragraph.style.name if paragraph.style else "Normal"
                    
                    # Identify headings and important content
                    if any(heading in style_name.lower() for heading in ['heading', 'title']):
                        content_parts.append(f"\n### {paragraph.text.strip()} ###")
                    elif style_name == "Normal":
                        content_parts.append(paragraph.text.strip())
                    else:
                        content_parts.append(f"[{style_name}] {paragraph.text.strip()}")
            
            # Extract tables if any
            if doc.tables:
                content_parts.append("\n=== DOCUMENT TABLES ===")
                for table_idx, table in enumerate(doc.tables):
                    content_parts.append(f"\n--- Table {table_idx + 1} ---")
                    table_content = self._extract_table_content(table)
                    content_parts.append(table_content)
            
            full_content = '\n'.join(content_parts)
            
            self.logger.info(f"✅ DOCX processed: {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables")
            return full_content
            
        except Exception as e:
            self.logger.error(f"❌ DOCX processing failed: {str(e)}")
            raise ContentProcessingError(f"DOCX processing failed: {str(e)}")
    
    def _extract_properties(self, doc) -> Dict[str, Any]:
        """Extract document properties"""
        try:
            properties = {}
            if hasattr(doc, 'core_properties'):
                cp = doc.core_properties
                properties['title'] = cp.title or ''
                properties['author'] = cp.author or ''
                properties['subject'] = cp.subject or ''
                properties['created'] = str(cp.created) if cp.created else ''
                properties['modified'] = str(cp.modified) if cp.modified else ''
            return properties
        except Exception as e:
            self.logger.warning(f"⚠️ Properties extraction failed: {str(e)}")
            return {}
    
    def _extract_table_content(self, table) -> str:
        """Extract table content in readable format"""
        try:
            rows = []
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if any(cells):  # Only add non-empty rows
                    rows.append(" | ".join(cells))
            return '\n'.join(rows)
        except Exception as e:
            return f"Table extraction error: {str(e)}"

class EnhancedPPTXProcessor:
    """Advanced PPTX processor with slide-level content and layout analysis"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.PPTXProcessor")
    
    async def process_file(self, file_path: str) -> str:
        """Process PPTX file with slide-by-slide content extraction"""
        try:
            self.logger.info(f"🎯 Processing PPTX: {file_path}")
            
            prs = Presentation(file_path)
            
            # Extract presentation properties
            properties = self._extract_properties(prs)
            
            content_parts = [
                "=== POWERPOINT PRESENTATION ANALYSIS ===",
                f"Title: {properties.get('title', 'Unknown')}",
                f"Author: {properties.get('author', 'Unknown')}",
                f"Slides: {len(prs.slides)}",
                f"Created: {properties.get('created', 'Unknown')}",
                "",
                "=== SLIDE CONTENT ===",
            ]
            
            # Process each slide
            for slide_idx, slide in enumerate(prs.slides):
                content_parts.append(f"\n--- Slide {slide_idx + 1} ---")
                
                # Extract slide layout information
                layout_name = slide.slide_layout.name if slide.slide_layout else "Unknown Layout"
                content_parts.append(f"Layout: {layout_name}")
                
                # Extract text from all shapes
                slide_text = self._extract_slide_text(slide)
                if slide_text:
                    content_parts.append(slide_text)
                else:
                    content_parts.append("[No text content on this slide]")
                
                # Extract notes if any
                if hasattr(slide, 'notes_slide') and slide.notes_slide:
                    notes_text = self._extract_notes_text(slide.notes_slide)
                    if notes_text:
                        content_parts.append(f"Speaker Notes: {notes_text}")
            
            full_content = '\n'.join(content_parts)
            
            self.logger.info(f"✅ PPTX processed: {len(prs.slides)} slides")
            return full_content
            
        except Exception as e:
            self.logger.error(f"❌ PPTX processing failed: {str(e)}")
            raise ContentProcessingError(f"PPTX processing failed: {str(e)}")
    
    def _extract_properties(self, prs) -> Dict[str, Any]:
        """Extract presentation properties"""
        try:
            properties = {}
            if hasattr(prs, 'core_properties'):
                cp = prs.core_properties
                properties['title'] = cp.title or ''
                properties['author'] = cp.author or ''
                properties['subject'] = cp.subject or ''
                properties['created'] = str(cp.created) if cp.created else ''
                properties['modified'] = str(cp.modified) if cp.modified else ''
            return properties
        except Exception as e:
            self.logger.warning(f"⚠️ Properties extraction failed: {str(e)}")
            return {}
    
    def _extract_slide_text(self, slide) -> str:
        """Extract all text from slide shapes"""
        text_parts = []
        try:
            for shape in slide.shapes:
                if hasattr(shape, 'text') and shape.text.strip():
                    # Identify shape type for better formatting
                    if hasattr(shape, 'name') and 'title' in shape.name.lower():
                        text_parts.append(f"TITLE: {shape.text.strip()}")
                    else:
                        text_parts.append(shape.text.strip())
                        
                # Extract table content if shape is a table
                if hasattr(shape, 'table') and shape.table:
                    table_content = self._extract_table_content(shape.table)
                    if table_content:
                        text_parts.append(f"TABLE:\n{table_content}")
                        
        except Exception as e:
            self.logger.warning(f"⚠️ Slide text extraction failed: {str(e)}")
            
        return '\n'.join(text_parts)
    
    def _extract_notes_text(self, notes_slide) -> str:
        """Extract speaker notes text"""
        try:
            notes_text = []
            for shape in notes_slide.shapes:
                if hasattr(shape, 'text') and shape.text.strip():
                    notes_text.append(shape.text.strip())
            return ' '.join(notes_text)
        except Exception as e:
            return ""
    
    def _extract_table_content(self, table) -> str:
        """Extract table content from PPTX table"""
        try:
            rows = []
            for row in table.rows:
                cells = []
                for cell in row.cells:
                    cells.append(cell.text.strip())
                if any(cells):
                    rows.append(" | ".join(cells))
            return '\n'.join(rows)
        except Exception as e:
            return f"Table extraction error: {str(e)}"

class EnhancedAudioVideoProcessor:
    """Advanced audio/video processor with Whisper AI transcription"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.AudioVideoProcessor")
        self.whisper_model = None
    
    async def process_file(self, file_path: str) -> str:
        """Process audio/video file with AI transcription"""
        try:
            self.logger.info(f"🎵 Processing audio/video: {file_path}")
            
            if not WHISPER_AVAILABLE:
                raise ContentProcessingError("Whisper not available for audio/video processing")
            
            # Load Whisper model if not already loaded
            if self.whisper_model is None:
                self.logger.info("🔄 Loading Whisper model...")
                import whisper
                self.whisper_model = whisper.load_model("base")  # Use base model for speed
                
            # Transcribe audio
            self.logger.info("🎯 Starting transcription...")
            result = self.whisper_model.transcribe(file_path)
            
            # Extract detailed information
            content_parts = [
                "=== AUDIO/VIDEO TRANSCRIPTION ===",
                f"File: {Path(file_path).name}",
                f"Language: {result.get('language', 'Unknown')}",
                "",
                "=== TRANSCRIPT ===",
                result['text']
            ]
            
            # Add segments if available for timestamped content
            if 'segments' in result and result['segments']:
                content_parts.append("\n=== TIMESTAMPED SEGMENTS ===")
                for segment in result['segments'][:10]:  # Limit to first 10 segments
                    start_time = self._format_timestamp(segment.get('start', 0))
                    end_time = self._format_timestamp(segment.get('end', 0))
                    text = segment.get('text', '').strip()
                    content_parts.append(f"[{start_time} - {end_time}] {text}")
            
            full_content = '\n'.join(content_parts)
            
            self.logger.info(f"✅ Audio/video processed: {len(result['text'])} characters transcribed")
            return full_content
            
        except Exception as e:
            self.logger.error(f"❌ Audio/video processing failed: {str(e)}")
            raise ContentProcessingError(f"Audio/video processing failed: {str(e)}")
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format timestamp in MM:SS format"""
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"

# Initialize enhanced processors
enhanced_pdf_processor = EnhancedPDFProcessor()
enhanced_docx_processor = EnhancedDOCXProcessor()
enhanced_pptx_processor = EnhancedPPTXProcessor()
enhanced_audio_video_processor = EnhancedAudioVideoProcessor()

# Pydantic Models for Request/Response Validation
class ContentUploadRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Content title")
    course_id: Optional[int] = Field(None, ge=1, description="Course ID")
    week_number: Optional[int] = Field(None, ge=1, le=20, description="Week number")
    material_type: Optional[str] = Field(None, pattern="^(pdf|video|audio|text|interactive)$")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

class ProcessingStatusResponse(BaseModel):
    processing_id: str
    material_id: int
    job_id: int
    status: str = Field(..., pattern="^(pending|processing|completed|failed)$")
    progress: int = Field(..., ge=0, le=100)
    error_message: Optional[str] = None
    ai_processed: bool
    embedding_count: int
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_time_remaining: Optional[int] = None  # seconds

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    course_filter: Optional[str] = Field(None, max_length=10)
    similarity_threshold: float = Field(0.3, ge=0.0, le=1.0)
    limit: int = Field(10, ge=1, le=50)

class SearchResult(BaseModel):
    course_material_id: int
    material_title: str
    material_type: str
    chunk_text: str
    similarity_score: float
    course_code: str

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    count: int
    execution_time_ms: int

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    services: Dict[str, str]
    system_info: Dict[str, Any]
    performance_metrics: Dict[str, float]

class SystemMetrics(BaseModel):
    total_uploads: int
    successful_uploads: int
    failed_uploads: int
    total_processing_time: float
    average_processing_time: float
    active_jobs: int
    queue_size: int

# Initialize FastAPI app with enhanced configuration
app = FastAPI(
    title="Enhanced MIVA University Content Processor",
    description="Production-ready AI-powered content processing service",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global AI stack instance
ai_stack = None

# Supported MIME types with enhanced detection
SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'text/plain': 'text',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'video/mp4': 'video',
    'video/avi': 'video',
    'video/quicktime': 'video',
    'audio/mp3': 'audio',
    'audio/wav': 'audio',
    'audio/m4a': 'audio',
    'image/jpeg': 'image',
    'image/png': 'image',
}

# Processing status tracking
class ProcessingStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# Utility Functions
def get_db_connection():
    """Get database connection with enhanced error handling"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        logger.error(f"Database connection failed: {e}")
        raise DatabaseError(f"Database connection failed: {str(e)}")

async def get_ai_stack():
    """Get AI stack instance with connection validation"""
    global ai_stack
    if ai_stack is None:
        try:
            ai_stack = MIVAAIStack()
            if not await ai_stack.test_connection():
                raise AIProcessingError("AI services unavailable")
            logger.info("AI stack initialized successfully")
        except Exception as e:
            logger.error(f"AI stack initialization failed: {e}")
            raise AIProcessingError(f"AI services unavailable: {str(e)}")
    return ai_stack

def validate_file(file: UploadFile) -> tuple[str, str]:
    """Enhanced file validation with detailed error reporting"""
    try:
        # Check file size
        if file.size and file.size > Config.MAX_FILE_SIZE:
            raise FileValidationError(
                f"File size {file.size} exceeds maximum allowed size {Config.MAX_FILE_SIZE}",
                {"file_size": file.size, "max_size": Config.MAX_FILE_SIZE}
            )
        
        # Check file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in Config.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"File extension '{file_extension}' not supported",
                {"file_extension": file_extension, "allowed_extensions": list(Config.ALLOWED_EXTENSIONS)}
            )
        
        # Determine content type
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if content_type not in SUPPORTED_MIME_TYPES:
            raise FileValidationError(
                f"Content type '{content_type}' not supported",
                {"content_type": content_type, "supported_types": list(SUPPORTED_MIME_TYPES.keys())}
            )
        
        file_type = SUPPORTED_MIME_TYPES[content_type]
        logger.info(f"File validation successful: {file.filename} ({file_type})")
        return file_type, content_type
        
    except FileValidationError:
        raise
    except Exception as e:
        logger.error(f"File validation error: {e}")
        raise FileValidationError(f"File validation failed: {str(e)}")

# Enhanced Content Processors
class EnhancedContentProcessor:
    """Enhanced content processor with improved extraction"""
    
    @staticmethod
    def create_content_chunks(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        """Create overlapping text chunks with better context preservation"""
        if not text.strip():
            return []
        
        # Split by sentences first for better chunk boundaries
        sentences = text.replace('\n', ' ').split('. ')
        words = []
        for sentence in sentences:
            words.extend(sentence.split())
        
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if len(chunk.strip()) > 50:  # Only meaningful chunks
                chunks.append(chunk)
        
        return chunks

class EnhancedPDFProcessor(EnhancedContentProcessor):
    """Enhanced PDF processor with better text extraction"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from PDF with enhanced error handling"""
        if not PDF_AVAILABLE:
            raise AIProcessingError("PDF processing not available")
        
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text += f"Page {page_num + 1}:\n{page_text}\n\n"
                    except Exception as e:
                        logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                        continue
            
            if not text.strip():
                raise AIProcessingError("No text could be extracted from PDF")
            
            return text.strip()
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            raise AIProcessingError(f"PDF text extraction failed: {str(e)}")

class EnhancedDOCXProcessor(EnhancedContentProcessor):
    """Enhanced DOCX processor"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from DOCX file"""
        if not DOCX_AVAILABLE:
            raise AIProcessingError("DOCX processing not available")
        
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text += paragraph.text + "\n"
            
            if not text.strip():
                raise AIProcessingError("No text could be extracted from DOCX")
            
            return text.strip()
        except Exception as e:
            logger.error(f"DOCX text extraction failed: {e}")
            raise AIProcessingError(f"DOCX text extraction failed: {str(e)}")

class EnhancedPPTXProcessor(EnhancedContentProcessor):
    """Enhanced PPTX processor"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from PPTX file"""
        if not PPTX_AVAILABLE:
            raise AIProcessingError("PPTX processing not available")
        
        try:
            prs = Presentation(file_path)
            text = ""
            for slide_num, slide in enumerate(prs.slides, 1):
                slide_text = f"Slide {slide_num}:\n"
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_text += shape.text + "\n"
                text += slide_text + "\n"
            
            if not text.strip():
                raise AIProcessingError("No text could be extracted from PPTX")
            
            return text.strip()
        except Exception as e:
            logger.error(f"PPTX text extraction failed: {e}")
            raise AIProcessingError(f"PPTX text extraction failed: {str(e)}")

class EnhancedTextProcessor(EnhancedContentProcessor):
    """Enhanced text processor"""
    
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from plain text file with encoding detection"""
        try:
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        text = file.read()
                        if text.strip():
                            return text.strip()
                except UnicodeDecodeError:
                    continue
            
            raise AIProcessingError("Could not decode text file with any supported encoding")
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise AIProcessingError(f"Text extraction failed: {str(e)}")

# Exception Handlers
@app.exception_handler(ContentProcessingError)
async def content_processing_exception_handler(request: Request, exc: ContentProcessingError):
    """Handle content processing exceptions"""
    logger.error(f"Content processing error: {exc.message}", extra={"error_code": exc.error_code, "details": exc.details})
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(FileValidationError)
async def file_validation_exception_handler(request: Request, exc: FileValidationError):
    """Handle file validation exceptions"""
    logger.warning(f"File validation error: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=422,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(DatabaseError)
async def database_exception_handler(request: Request, exc: DatabaseError):
    """Handle database exceptions"""
    logger.error(f"Database error: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=503,
        content={
            "error": exc.error_code,
            "message": "Database service temporarily unavailable",
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(AIProcessingError)
async def ai_processing_exception_handler(request: Request, exc: AIProcessingError):
    """Handle AI processing exceptions"""
    logger.error(f"AI processing error: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=503,
        content={
            "error": exc.error_code,
            "message": "AI processing service temporarily unavailable",
            "timestamp": datetime.now().isoformat()
        }
    )

# Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup with comprehensive checks"""
    logger.info("🚀 Enhanced MIVA Content Processor starting up...")
    
    # Test database connection
    try:
        conn = get_db_connection()
        conn.close()
        logger.info("✅ Database connection verified")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise
    
    # Test AI stack
    try:
        stack = await get_ai_stack()
        logger.info("✅ AI stack initialized and verified")
    except Exception as e:
        logger.error(f"❌ AI stack initialization failed: {e}")
        raise
    
    # Create upload directory
    Config.UPLOAD_DIR.mkdir(exist_ok=True)
    logger.info(f"✅ Upload directory ready: {Config.UPLOAD_DIR}")
    
    logger.info("🎉 Enhanced MIVA Content Processor ready for requests!")

# Enhanced API Endpoints
@app.get("/", response_model=Dict[str, Any])
async def root():
    """Enhanced root endpoint with detailed service information"""
    return {
        "service": "Enhanced MIVA University Content Processor",
        "version": "2.0.0",
        "status": "operational",
        "features": {
            "ai_processing": True,
            "semantic_search": True,
            "multi_format_support": True,
            "rate_limiting": True,
            "enhanced_monitoring": True
        },
        "supported_formats": list(SUPPORTED_MIME_TYPES.keys()),
        "processors": {
            "pdf": PDF_AVAILABLE,
            "docx": DOCX_AVAILABLE,
            "pptx": PPTX_AVAILABLE,
            "audio_video": WHISPER_AVAILABLE
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Comprehensive health check with system metrics"""
    start_time = time.time()
    
    # Test database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        db_status = "healthy"
        db_response_time = time.time() - start_time
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        db_response_time = -1
    
    # Test AI stack
    try:
        stack = await get_ai_stack()
        ai_status = "healthy"
        ai_response_time = time.time() - start_time - db_response_time
    except Exception as e:
        ai_status = f"unhealthy: {str(e)}"
        ai_response_time = -1
    
    # System information
    system_info = {
        "upload_directory": str(Config.UPLOAD_DIR),
        "max_file_size_mb": Config.MAX_FILE_SIZE // (1024 * 1024),
        "supported_extensions": list(Config.ALLOWED_EXTENSIONS),
        "python_version": sys.version.split()[0],
        "platform": sys.platform
    }
    
    # Performance metrics
    performance_metrics = {
        "db_response_time_ms": round(db_response_time * 1000, 2) if db_response_time > 0 else -1,
        "ai_response_time_ms": round(ai_response_time * 1000, 2) if ai_response_time > 0 else -1,
        "total_response_time_ms": round((time.time() - start_time) * 1000, 2)
    }
    
    overall_status = "healthy" if db_status == "healthy" and ai_status == "healthy" else "degraded"
    
    return HealthCheckResponse(
        status=overall_status,
        timestamp=datetime.now(),
        version="2.0.0",
        services={
            "database": db_status,
            "ai_stack": ai_status,
            "file_storage": "healthy" if Config.UPLOAD_DIR.exists() else "unhealthy"
        },
        system_info=system_info,
        performance_metrics=performance_metrics
    )

# Enhanced file validation functions
async def validate_file_enhanced(file: UploadFile) -> None:
    """Enhanced file validation with detailed error reporting."""
    if not file.filename:
        raise FileValidationError("No filename provided")
    
    # Check file size
    if hasattr(file, 'size') and file.size and file.size > Config.MAX_FILE_SIZE:
        max_size_mb = Config.MAX_FILE_SIZE / 1024 / 1024
        raise FileValidationError(
            f"File size ({file.size / 1024 / 1024:.1f}MB) exceeds maximum allowed size ({max_size_mb:.0f}MB)",
            details={"max_size_mb": max_size_mb, "file_size_mb": file.size / 1024 / 1024}
        )
    
    # Check file extension
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in Config.ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"File type '{file_extension}' not supported",
            details={"supported_extensions": list(Config.ALLOWED_EXTENSIONS)}
        )
    
    # Check MIME type
    content_type = file.content_type
    if content_type and not any(mime in content_type for mime in [
        'text/', 'application/pdf', 'application/vnd.openxmlformats-officedocument',
        'video/', 'audio/', 'application/msword'
    ]):
        raise FileValidationError(
            f"MIME type '{content_type}' not supported",
            details={"content_type": content_type}
        )
    
    # Read a small portion to verify it's not corrupted
    try:
        await file.seek(0)
        sample = await file.read(1024)
        await file.seek(0)
        
        if not sample:
            raise FileValidationError("File appears to be empty")
            
    except Exception as e:
        raise FileValidationError(f"Failed to read file: {str(e)}")

# Content Processing Endpoints with Enhanced Error Handling

@app.post("/process-content")
@limiter.limit("5/minute")
async def process_content(
    request: Request,
    title: str = Form(...),
    course_id: Optional[int] = Form(None),
    week_number: Optional[int] = Form(None),
    material_type: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Process uploaded content with enhanced validation and error handling."""
    try:
        logger.info(f"🔄 Processing content upload: {title}")
        
        # Enhanced file validation
        await validate_file_enhanced(file)
        
        # Validate request data
        request_data = ContentUploadRequest(
            title=title,
            course_id=course_id,
            week_number=week_number,
            material_type=material_type
        )
        
        # Save file with secure filename
        safe_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{safe_filename}"
        file_path = Config.UPLOAD_DIR / unique_filename
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"✅ File saved: {file_path}")
        
        # Insert into database with enhanced error handling
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO course_materials (title, course_id, week_number, material_type, file_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                request_data.title,
                request_data.course_id,
                request_data.week_number,
                request_data.material_type or 'text',
                str(file_path),
                datetime.now()
            ))
            result = cursor.fetchone()
            if result is None:
                raise DatabaseError("No ID returned from database insertion")
            
            # Handle RealDictCursor result (returns dict) vs regular cursor result (returns tuple)
            if isinstance(result, dict):
                material_id = result['id']
            else:
                material_id = result[0]
                
            if not material_id:
                raise DatabaseError("Invalid material ID returned from database")
                
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Material inserted with ID: {material_id}")
            
        except Exception as e:
            logger.error(f"❌ Database insertion failed: {str(e)}")
            # Clean up uploaded file on database failure
            if file_path.exists():
                file_path.unlink()
            raise DatabaseError(f"Failed to save material metadata: {str(e)}")
        
        # Create processing job
        job_type_mapping = {
            'pdf': 'pdf_processing',
            'video': 'video_transcription', 
            'audio': 'video_transcription',
            'interactive': 'interactive_parsing',
            'text': 'pdf_processing'
        }
        
        job_type = job_type_mapping.get(request_data.material_type, 'pdf_processing')
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ai_processing_jobs (course_material_id, job_type, status, created_at)
                VALUES (%s, %s, 'pending', %s) RETURNING id
            """, (material_id, job_type, datetime.now()))
            
            result = cursor.fetchone()
            job_id = result['id'] if isinstance(result, dict) else result[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Processing job created with ID: {job_id}")
            
        except Exception as e:
            logger.error(f"❌ Job creation failed: {str(e)}")
            raise DatabaseError(f"Failed to create processing job: {str(e)}")
        
        # Start background processing
        try:
            await start_background_processing(material_id, job_id, str(file_path))
            logger.info(f"🚀 Background processing started for job {job_id}")
        except Exception as e:
            logger.error(f"❌ Background processing failed: {str(e)}")
            raise AIProcessingError(f"Failed to start AI processing: {str(e)}")
        
        return {
            "message": "Content uploaded and processing started",
            "material_id": material_id,
            "processing_id": job_id,
            "status": "processing"
        }
        
    except (FileValidationError, ContentProcessingError, DatabaseError, AIProcessingError) as e:
        # These are our custom exceptions, re-raise them
        raise e
    except Exception as e:
        logger.error(f"❌ Unexpected error in process_content: {str(e)}")
        raise ContentProcessingError(f"Unexpected error during processing: {str(e)}")

@app.get("/processing-status/{processing_id}")
@limiter.limit("30/minute")
async def get_processing_status(request: Request, processing_id: int):
    """Get processing status with enhanced error handling."""
    try:
        logger.info(f"📊 Checking status for processing ID: {processing_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT aj.status, aj.started_at, aj.completed_at, aj.error_message,
                   cm.title, cm.id as material_id
            FROM ai_processing_jobs aj
            JOIN course_materials cm ON aj.course_material_id = cm.id
            WHERE aj.id = %s
        """, (processing_id,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise ContentProcessingError(
                f"Processing job {processing_id} not found",
                error_code="JOB_NOT_FOUND"
            )
        
        # Handle both tuple and dict results from cursor
        if isinstance(result, dict):
            status = result['status']
            started_at = result['started_at']
            completed_at = result['completed_at']
            error_message = result['error_message']
            title = result['title']
            material_id = result['material_id']
        else:
            status, started_at, completed_at, error_message, title, material_id = result
        
        # Helper function to safely format datetime
        def safe_isoformat(dt_value):
            if dt_value is None:
                return None
            if hasattr(dt_value, 'isoformat'):
                return dt_value.isoformat()
            return str(dt_value)  # Return as string if already a string
        
        response_data = {
            "processing_id": processing_id,
            "material_id": material_id,
            "title": title,
            "status": status,
            "started_at": safe_isoformat(started_at),
            "completed_at": safe_isoformat(completed_at)
        }
        
        if error_message:
            response_data["error_message"] = error_message
            
        logger.info(f"✅ Status retrieved for job {processing_id}: {status}")
        return response_data
        
    except ContentProcessingError as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error getting processing status: {str(e)}")
        raise DatabaseError(f"Failed to retrieve processing status: {str(e)}")

@app.post("/search")
@limiter.limit("20/minute") 
async def search_content(request: Request, search_request: SearchRequest):
    """Enhanced semantic search with validation."""
    try:
        logger.info(f"🔍 Searching for: {search_request.query}")
        
        if not search_request.query.strip():
            raise ContentProcessingError(
                "Search query cannot be empty",
                error_code="INVALID_QUERY"
            )
        
        # Generate query embedding
        try:
            query_embedding_response = await ai_stack.generate_embeddings(search_request.query)
            if not query_embedding_response:
                raise AIProcessingError("Failed to generate query embeddings")
            
            # Extract embedding array from AI response
            if isinstance(query_embedding_response, dict) and 'embedding' in query_embedding_response:
                query_embedding = query_embedding_response['embedding']
            elif isinstance(query_embedding_response, list):
                query_embedding = query_embedding_response
            else:
                raise AIProcessingError("Invalid embedding format from AI response")
                
        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {str(e)}")
            raise AIProcessingError(f"Search embedding failed: {str(e)}")
        
        # Perform semantic search
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT cm.id, cm.title::TEXT, cm.material_type, cm.week_number,
                       apc.ai_summary, apc.key_concepts,
                       (ce.embedding <=> %s::vector) as similarity_score
                FROM course_materials cm
                JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                JOIN content_embeddings ce ON apc.id = ce.ai_processed_id
                JOIN courses c ON cm.course_id = c.id
                WHERE (%s IS NULL OR c.course_code = %s)
                ORDER BY ce.embedding <=> %s::vector
                LIMIT %s
            """, (
                query_embedding,
                search_request.course_filter,
                search_request.course_filter,
                query_embedding,
                search_request.limit
            ))
            
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            search_results = []
            for row in results:
                # Handle both tuple and dict results from cursor
                if isinstance(row, dict):
                    material_id = row['id']
                    title = row['title']
                    material_type = row['material_type']
                    week_number = row['week_number']
                    ai_summary = row['ai_summary']
                    key_concepts = row['key_concepts']
                    similarity_score = row['similarity_score']
                else:
                    material_id, title, material_type, week_number, ai_summary, key_concepts, similarity_score = row
                
                search_results.append({
                    "material_id": material_id,
                    "title": title,
                    "material_type": material_type,
                    "week_number": week_number,
                    "ai_summary": ai_summary,
                    "key_concepts": key_concepts,
                    "similarity_score": float(similarity_score),
                    "relevance": "high" if similarity_score < 0.3 else "medium" if similarity_score < 0.6 else "low"
                })
            
            logger.info(f"✅ Search completed: {len(search_results)} results found")
            
            return {
                "query": search_request.query,
                "results_count": len(search_results),
                "results": search_results
            }
            
        except Exception as e:
            logger.error(f"❌ Search query failed: {str(e)}")
            raise DatabaseError(f"Search operation failed: {str(e)}")
        
    except (ContentProcessingError, AIProcessingError, DatabaseError) as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Unexpected search error: {str(e)}")
        raise ContentProcessingError(f"Search failed: {str(e)}")

@app.get("/courses/{course_code}/materials")
@limiter.limit("30/minute")
async def get_course_materials(request: Request, course_code: str):
    """Get course materials with enhanced error handling."""
    try:
        logger.info(f"📚 Getting materials for course: {course_code}")
        
        if not course_code.strip():
            raise ContentProcessingError(
                "Course code cannot be empty",
                error_code="INVALID_COURSE_CODE"
            )
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cm.id, cm.title, cm.material_type, cm.week_number, 
                   cm.created_at, apc.ai_summary, apc.key_concepts
            FROM course_materials cm
            LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
            WHERE cm.course_id = (
                SELECT id FROM courses WHERE course_code = %s LIMIT 1
            )
            ORDER BY cm.week_number, cm.created_at
        """, (course_code,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not results:
            logger.warning(f"⚠️ No materials found for course: {course_code}")
            return {
                "course_code": course_code,
                "materials_count": 0,
                "materials": []
            }
        
        materials = []
        for row in results:
            material_id, title, material_type, week_number, created_at, ai_summary, key_concepts = row
            materials.append({
                "material_id": material_id,
                "title": title,
                "material_type": material_type,
                "week_number": week_number,
                "created_at": created_at.isoformat() if created_at else None,
                "ai_summary": ai_summary,
                "key_concepts": key_concepts,
                "has_ai_processing": ai_summary is not None
            })
        
        logger.info(f"✅ Retrieved {len(materials)} materials for course {course_code}")
        
        return {
            "course_code": course_code,
            "materials_count": len(materials),
            "materials": materials
        }
        
    except ContentProcessingError as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error getting course materials: {str(e)}")
        raise DatabaseError(f"Failed to retrieve course materials: {str(e)}")

# Helper function for background processing
async def start_background_processing(material_id: int, job_id: int, file_path: str):
    """Start background AI processing with enhanced error handling."""
    conn = None
    try:
        # Update job status to processing
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE ai_processing_jobs 
            SET status = 'processing', started_at = %s 
            WHERE id = %s
        """, (datetime.now(), job_id))
        conn.commit()
        cursor.close()
        
        # Process the content
        extracted_text = await extract_text_from_file(file_path)
        
        # Generate AI summary and analysis
        ai_summary = await ai_stack.generate_llm_response(
            f"Summarize this educational content in 2-3 sentences:\n\n{extracted_text[:2000]}"
        )
        
        key_concepts = await ai_stack.analyze_content(extracted_text[:3000])
        
        # Generate embeddings
        embeddings_response = await ai_stack.generate_embeddings(extracted_text[:8000])
        
        # Extract embedding array from AI response
        if isinstance(embeddings_response, dict) and 'embedding' in embeddings_response:
            embeddings_array = embeddings_response['embedding']
        elif isinstance(embeddings_response, list):
            embeddings_array = embeddings_response
        else:
            logger.error(f"❌ Unexpected embeddings format: {type(embeddings_response)}")
            embeddings_array = []
        
        # Serialize key_concepts for database storage
        if isinstance(key_concepts, dict):
            # Convert dict to list of strings for PostgreSQL array
            key_concepts_array = [f"{k}: {v}" for k, v in key_concepts.items()]
        elif isinstance(key_concepts, list):
            key_concepts_array = [str(item) for item in key_concepts]
        else:
            key_concepts_array = [str(key_concepts)] if key_concepts else []
        
        # Save processed content
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ai_processed_content 
            (course_material_id, extracted_text, ai_summary, key_concepts)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (
            material_id,
            extracted_text,
            ai_summary.get('response', '') if ai_summary else '',
            key_concepts_array
        ))
        
        result = cursor.fetchone()
        ai_processed_id = result['id'] if isinstance(result, dict) else result[0]
        
        # Save embeddings
        cursor.execute("""
            INSERT INTO content_embeddings (course_material_id, ai_processed_id, chunk_text, chunk_index, chunk_type, embedding)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (material_id, ai_processed_id, extracted_text[:1000], 1, 'content', str(embeddings_array)))
        
        # Mark job as completed
        cursor.execute("""
            UPDATE ai_processing_jobs 
            SET status = 'completed', completed_at = %s 
            WHERE id = %s
        """, (datetime.now(), job_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Background processing completed for material {material_id}")
        
    except Exception as e:
        logger.error(f"❌ Background processing failed: {str(e)}")
        
        # Mark job as failed
        try:
            if conn is None:
                conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE ai_processing_jobs 
                SET status = 'failed', error_message = %s, completed_at = %s 
                WHERE id = %s
            """, (str(e), datetime.now(), job_id))
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as db_error:
            logger.error(f"❌ Failed to update job status: {str(db_error)}")
        
        raise AIProcessingError(f"Background processing failed: {str(e)}")

async def extract_text_from_file(file_path: str) -> str:
    """Extract text from various file formats using enhanced processors."""
    try:
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileValidationError(f"File not found: {file_path}")
        
        file_extension = file_path.suffix.lower()
        logger.info(f"🔍 Processing file type: {file_extension}")
        
        # Text files - simple read
        if file_extension == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                logger.info(f"✅ Text file processed: {len(content)} characters")
                return content
        
        # PDF files - enhanced processor with metadata
        elif file_extension == '.pdf':
            if not PDF_AVAILABLE:
                raise ContentProcessingError("PDF processing not available (PyPDF2 not installed)")
            return await enhanced_pdf_processor.process_file(str(file_path))
        
        # DOCX files - enhanced processor with styles and tables
        elif file_extension == '.docx':
            if not DOCX_AVAILABLE:
                raise ContentProcessingError("DOCX processing not available (python-docx not installed)")
            return await enhanced_docx_processor.process_file(str(file_path))
        
        # PPTX files - enhanced processor with slide analysis
        elif file_extension == '.pptx':
            if not PPTX_AVAILABLE:
                raise ContentProcessingError("PPTX processing not available (python-pptx not installed)")
            return await enhanced_pptx_processor.process_file(str(file_path))
        
        # Audio/Video files - AI transcription
        elif file_extension in ['.mp3', '.wav', '.m4a', '.flac', '.mp4', '.avi', '.mov', '.mkv', '.webm']:
            if not WHISPER_AVAILABLE:
                raise ContentProcessingError("Audio/video processing not available (whisper not installed)")
            return await enhanced_audio_video_processor.process_file(str(file_path))
        
        # Other document formats that might contain text
        elif file_extension in ['.rtf', '.odt']:
            logger.warning(f"⚠️ Limited support for {file_extension} - attempting text extraction")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except UnicodeDecodeError:
                # Try with different encodings
                for encoding in ['latin1', 'cp1252', 'iso-8859-1']:
                    try:
                        with open(file_path, 'r', encoding=encoding) as f:
                            return f.read()
                    except UnicodeDecodeError:
                        continue
                raise FileValidationError(f"Could not decode {file_extension} file with any supported encoding")
        
        # Unsupported file types
        else:
            # Last resort: try to read as text
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    logger.warning(f"⚠️ Processed {file_extension} as plain text")
                    return content
            except UnicodeDecodeError:
                raise FileValidationError(
                    f"Unsupported file format: {file_extension}. "
                    f"Supported formats: PDF, DOCX, PPTX, TXT, MP3, WAV, MP4, AVI, MOV"
                )
    
    except (FileValidationError, ContentProcessingError) as e:
        # Re-raise our custom exceptions
        raise e
    except Exception as e:
        logger.error(f"❌ Text extraction failed for {file_path}: {str(e)}")
        raise ContentProcessingError(f"Failed to extract text from file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "enhanced_content_processor_api:app",
        host="0.0.0.0",
        port=8082,  # Different port to test alongside current service
        reload=True,
        log_level="info"
    )
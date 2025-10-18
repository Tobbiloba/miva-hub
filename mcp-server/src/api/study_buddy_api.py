#!/usr/bin/env python3
"""
MIVA University Study Buddy API
Intelligent Q&A system using processed course content
"""

import asyncio
import time
import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import numpy as np

# Import our existing AI integration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'core'))
from ai_integration import MIVAAIStack

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database Configuration - unified with Next.js frontend
def get_db_config():
    """Get unified database configuration using POSTGRES_URL"""
    postgres_url = os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL')
    
    if postgres_url:
        # Parse POSTGRES_URL
        import urllib.parse as urlparse
        parsed = urlparse.urlparse(postgres_url)
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/'),
            'user': parsed.username,
            'password': parsed.password,
            'cursor_factory': RealDictCursor
        }
    else:
        # Fallback to individual environment variables
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'database': os.getenv('DB_NAME', 'better_chatbot'),  # Changed from miva_academic
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', ''),
            'cursor_factory': RealDictCursor
        }

DB_CONFIG = get_db_config()

# Global AI Stack Instance
ai_stack = None

# Pydantic Models
class ChatQuestion(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    course_id: Optional[str] = Field(None, description="Optional course context (UUID)")
    session_id: Optional[int] = Field(None, description="Continue existing session")
    difficulty_preference: str = Field("medium", pattern="^(beginner|medium|advanced)$")
    
    @field_validator('question')
    @classmethod
    def validate_question(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty')
        return v.strip()

class StudySessionStart(BaseModel):
    course_id: Optional[str] = Field(None, description="Course to focus on (UUID)")
    learning_goals: List[str] = Field(default_factory=list, max_length=5)
    difficulty_preference: str = Field("medium", pattern="^(beginner|medium|advanced)$")

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    session_id: int
    confidence_score: float
    response_time_ms: int
    suggested_follow_ups: List[str]

class StudySessionResponse(BaseModel):
    session_id: int
    course_name: str
    status: str
    created_at: str

# Study Tools Models
class StudyGuideRequest(BaseModel):
    course_id: str = Field(..., description="Course ID (UUID) to generate study guide for")
    topics: List[str] = Field(default_factory=list, max_length=10, description="Specific topics to focus on")
    difficulty_level: str = Field("medium", pattern="^(beginner|medium|advanced)$")
    weeks: List[int] = Field(default_factory=list, max_length=20, description="Specific weeks to include")

class FlashcardsRequest(BaseModel):
    course_id: str = Field(..., description="Course ID (UUID) to generate flashcards for")
    topic: str = Field(..., min_length=1, max_length=100, description="Specific topic for flashcards")
    count: int = Field(10, ge=5, le=50, description="Number of flashcards to generate")
    difficulty_level: str = Field("medium", pattern="^(beginner|medium|advanced)$")

class QuizRequest(BaseModel):
    course_id: str = Field(..., description="Course ID (UUID) to generate quiz for")
    topics: List[str] = Field(default_factory=list, max_length=5, description="Topics to quiz on")
    question_count: int = Field(10, ge=5, le=25, description="Number of questions")
    question_types: List[str] = Field(default_factory=lambda: ["multiple_choice"], 
                                    description="Types: multiple_choice, short_answer, essay")
    difficulty_level: str = Field("medium", pattern="^(beginner|medium|advanced)$")

class StudyGuideResponse(BaseModel):
    guide_id: int
    course_name: str
    title: str
    sections: List[Dict[str, Any]]
    total_sections: int
    estimated_study_time: str
    sources_used: List[Dict[str, Any]]
    created_at: str

class FlashcardsResponse(BaseModel):
    flashcards_id: int
    course_name: str
    topic: str
    cards: List[Dict[str, str]]  # [{"front": "question", "back": "answer"}]
    total_cards: int
    sources_used: List[Dict[str, Any]]
    created_at: str

class QuizResponse(BaseModel):
    quiz_id: int
    course_name: str
    title: str
    questions: List[Dict[str, Any]]
    total_questions: int
    estimated_time: str
    sources_used: List[Dict[str, Any]]
    created_at: str

# Exam Models
class ExamGenerateRequest(BaseModel):
    course_id: str = Field(..., description="Course ID to generate exam for")
    exam_type: str = Field("midterm", pattern="^(midterm|final|chapter_test)$")
    weeks_covered: Optional[str] = Field(None, description="Comma-separated week numbers (e.g., '1,2,3')")
    question_count: int = Field(50, ge=10, le=100)
    difficulty_mix: Dict[str, float] = Field(default_factory=lambda: {"easy": 0.3, "medium": 0.5, "hard": 0.2})
    question_types: Dict[str, float] = Field(default_factory=lambda: {"multiple_choice": 0.7, "short_answer": 0.3})

class ExamSubmitRequest(BaseModel):
    exam_id: str = Field(..., description="Exam ID")
    student_id: str = Field(..., description="Student ID")
    answers: Dict[int, str] = Field(..., description="Question number to answer mapping")
    time_taken_minutes: int = Field(..., ge=1)

class ExamGenerateResponse(BaseModel):
    exam_id: str
    course_name: str
    exam_type: str
    questions: List[Dict[str, Any]]
    questions_with_answers: List[Dict[str, Any]]
    total_questions: int
    grading_rubric: Dict[str, Any]
    created_at: str

class ExamSubmitResponse(BaseModel):
    exam_id: str
    student_id: str
    score_percentage: float
    correct_answers: int
    total_questions: int
    grade: str
    per_question_results: List[Dict[str, Any]]
    weak_areas: List[str]
    recommendations: List[str]

# Custom Exceptions
class StudyBuddyError(Exception):
    def __init__(self, message: str, error_code: str = "STUDY_BUDDY_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class ContentNotFoundError(StudyBuddyError):
    def __init__(self, message: str = "No relevant content found"):
        super().__init__(message, "CONTENT_NOT_FOUND")

class AIProcessingError(StudyBuddyError):
    def __init__(self, message: str = "AI processing failed"):
        super().__init__(message, "AI_PROCESSING_ERROR")

# Database Helper Functions
def get_db_connection():
    """Get database connection with error handling"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise StudyBuddyError("Database service temporarily unavailable")

async def get_ai_stack():
    """Get AI stack instance with lazy initialization"""
    global ai_stack
    if ai_stack is None:
        ai_stack = MIVAAIStack()
        connection_ok = await ai_stack.test_connection()
        if not connection_ok:
            raise AIProcessingError("AI models not available")
    return ai_stack

# Core Study Buddy Functions
class StudyBuddyEngine:
    """Core engine for intelligent Q&A and study assistance"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.StudyBuddyEngine")
        
    async def find_relevant_content(self, question: str, course_id: Optional[int] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Find relevant content using semantic search"""
        try:
            # Generate embedding for the question
            ai_stack = await get_ai_stack()
            embedding_response = await ai_stack.generate_embeddings(question)
            
            # Extract embedding array
            if isinstance(embedding_response, dict) and 'embedding' in embedding_response:
                question_embedding = embedding_response['embedding']
            elif isinstance(embedding_response, list):
                question_embedding = embedding_response
            else:
                raise AIProcessingError("Failed to generate question embedding")
            
            # Search for similar content
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    cm.id as material_id,
                    cm.title,
                    cm.material_type,
                    cm.week_number,
                    cm.public_url,
                    apc.id as ai_processed_id,
                    apc.ai_summary,
                    apc.key_concepts,
                    ce.chunk_text,
                    ce.chunk_index,
                    (ce.embedding <=> %s::vector) as similarity_score
                FROM course_material cm
                JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                JOIN content_embedding ce ON apc.id = ce.ai_processed_id
                WHERE (%s IS NULL OR cm.course_id = %s)
                  AND ce.chunk_text IS NOT NULL
                ORDER BY ce.embedding <=> %s::vector
                LIMIT %s
            """
            
            cursor.execute(query, (question_embedding, course_id, course_id, question_embedding, limit))
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            if not results:
                raise ContentNotFoundError("No relevant course content found for your question")
                
            # Format results
            relevant_content = []
            for row in results:
                content_item = {
                    "material_id": row['material_id'],
                    "ai_processed_id": str(row['ai_processed_id']),
                    "title": row['title'],
                    "material_type": row['material_type'],
                    "week_number": row['week_number'],
                    "public_url": row['public_url'],
                    "ai_summary": row['ai_summary'],
                    "key_concepts": row['key_concepts'],
                    "relevant_chunk": row['chunk_text'],
                    "chunk_index": row['chunk_index'],
                    "similarity_score": float(row['similarity_score'])
                }
                relevant_content.append(content_item)
                
            return relevant_content
            
        except Exception as e:
            self.logger.error(f"Content search failed: {str(e)}")
            raise ContentNotFoundError("Failed to search course content")
    
    async def generate_intelligent_response(self, question: str, relevant_content: List[Dict], difficulty_preference: str = "medium") -> Dict[str, Any]:
        """Generate context-aware response using relevant content"""
        try:
            # Build context from relevant content
            context_parts = []
            sources_info = []
            
            for i, content in enumerate(relevant_content[:3]):  # Use top 3 most relevant
                context_parts.append(f"""
Content {i+1} (from "{content['title']}", Week {content.get('week_number', 'N/A')}):
Summary: {content.get('ai_summary', 'N/A')}
Key Concepts: {', '.join(content.get('key_concepts', []))}
Relevant Text: {content['relevant_chunk'][:500]}...
""")
                
                sources_info.append({
                    "material_id": content['material_id'],
                    "ai_processed_id": content['ai_processed_id'],
                    "title": content['title'],
                    "material_type": content['material_type'],
                    "week_number": content.get('week_number'),
                    "public_url": content.get('public_url'),
                    "similarity_score": content['similarity_score'],
                    "chunk_index": content['chunk_index']
                })
            
            context_text = "\n".join(context_parts)
            
            # Create appropriate prompt based on difficulty preference
            difficulty_instructions = {
                "beginner": "Explain concepts simply, avoid jargon, use analogies and examples",
                "medium": "Provide balanced explanations with some technical detail",
                "advanced": "Use technical terminology and provide in-depth analysis"
            }
            
            prompt = f"""You are an intelligent study buddy for MIVA University students. Answer the student's question using ONLY the provided course content.

Difficulty Level: {difficulty_preference} - {difficulty_instructions[difficulty_preference]}

Student Question: {question}

Course Content Available:
{context_text}

Instructions:
1. Answer the question directly and helpfully
2. Use ONLY information from the provided course content
3. If the content doesn't fully answer the question, say so honestly
4. Cite which materials you're referencing (e.g., "According to Week 3 materials...")
5. Suggest related concepts the student might want to explore
6. Keep the tone friendly and encouraging

Response:"""
            
            # Generate response using AI
            ai_stack = await get_ai_stack()
            start_time = time.time()
            
            ai_response = await ai_stack.generate_llm_response(prompt)
            response_time = int((time.time() - start_time) * 1000)
            
            if not ai_response.get('success'):
                raise AIProcessingError("Failed to generate response")
            
            # Calculate confidence score based on content relevance
            avg_similarity = np.mean([content['similarity_score'] for content in relevant_content[:3]])
            confidence_score = float(max(0.1, min(0.95, 1.0 - avg_similarity)))  # Convert distance to confidence, ensure Python float
            
            # Generate follow-up suggestions
            follow_ups = await self._generate_follow_up_suggestions(question, relevant_content)
            
            return {
                "answer": ai_response['response'],
                "sources": sources_info,
                "confidence_score": confidence_score,
                "response_time_ms": response_time,
                "suggested_follow_ups": follow_ups
            }
            
        except Exception as e:
            self.logger.error(f"Response generation failed: {str(e)}")
            raise AIProcessingError("Failed to generate intelligent response")
    
    async def _generate_follow_up_suggestions(self, original_question: str, relevant_content: List[Dict]) -> List[str]:
        """Generate helpful follow-up question suggestions"""
        try:
            # Extract key concepts from relevant content
            all_concepts = set()
            for content in relevant_content[:2]:
                concepts = content.get('key_concepts', [])
                all_concepts.update(concepts[:3])  # Top 3 concepts per content
            
            if not all_concepts:
                return ["Can you explain this topic in more detail?", "What are some practical applications?"]
            
            # Create simple follow-up suggestions
            suggestions = [
                f"Can you explain more about {list(all_concepts)[0]}?" if all_concepts else "Can you explain this in more detail?",
                "What are some practical examples?",
                "How does this relate to other topics in the course?"
            ]
            
            return suggestions[:3]
            
        except Exception:
            # Fallback suggestions
            return ["Can you explain this topic further?", "What are some examples?", "How can I practice this?"]

# FastAPI Application
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown"""
    # Startup
    logger.info("🚀 MIVA Study Buddy API starting up...")
    
    # Test database connection
    try:
        conn = get_db_connection()
        conn.close()
        logger.info("✅ Database connection verified")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise
    
    # Test AI connection
    try:
        ai_stack = await get_ai_stack()
        logger.info("✅ AI stack initialized and verified")
    except Exception as e:
        logger.error(f"❌ AI stack initialization failed: {e}")
        raise
    
    logger.info("🎉 MIVA Study Buddy API ready for intelligent conversations!")
    
    yield
    
    # Shutdown
    logger.info("👋 MIVA Study Buddy API shutting down...")

app = FastAPI(
    title="MIVA University Study Buddy API",
    description="Intelligent Q&A system using processed course content",
    version="4.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global study buddy engine
study_engine = StudyBuddyEngine()

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database
        conn = get_db_connection()
        cursor = conn.cursor()
        start_time = time.time()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        db_response_time = (time.time() - start_time) * 1000
        cursor.close()
        conn.close()
        
        # Test AI stack
        ai_start = time.time()
        ai_stack = await get_ai_stack()
        ai_response_time = (time.time() - ai_start) * 1000
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "4.0.0",
            "services": {
                "database": "healthy",
                "ai_stack": "healthy",
                "study_buddy_engine": "ready"
            },
            "performance_metrics": {
                "db_response_time_ms": round(db_response_time, 2),
                "ai_response_time_ms": round(ai_response_time, 2),
                "total_response_time_ms": round(db_response_time + ai_response_time, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@app.post("/chat/session/start", response_model=StudySessionResponse)
async def start_study_session(request: StudySessionStart):
    """Start a new study session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get course name if course_id provided
        course_name = "General Study Session"
        if request.course_id:
            cursor.execute("SELECT title FROM course WHERE id = %s", (request.course_id,))
            course_result = cursor.fetchone()
            if course_result:
                course_name = course_result['title']
        
        # Create study session
        session_context = {
            "learning_goals": request.learning_goals,
            "difficulty_preference": request.difficulty_preference,
            "created_via": "api"
        }
        
        cursor.execute("""
            INSERT INTO study_sessions (course_id, session_context)
            VALUES (%s, %s) RETURNING id, created_at
        """, (request.course_id, Json(session_context)))
        
        result = cursor.fetchone()
        session_id = result['id']
        created_at = result['created_at']
        
        # Log session start
        cursor.execute("""
            INSERT INTO chat_messages (session_id, message_type, content, metadata)
            VALUES (%s, 'system', 'Study session started', %s)
        """, (session_id, Json({"course_name": course_name, "goals": request.learning_goals})))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"📚 New study session started: {session_id} for course: {course_name}")
        
        return StudySessionResponse(
            session_id=session_id,
            course_name=course_name,
            status="active",
            created_at=created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to start study session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create study session")

@app.post("/chat/ask", response_model=ChatResponse)
async def ask_question(question: ChatQuestion, background_tasks: BackgroundTasks):
    """Main intelligent Q&A endpoint"""
    try:
        logger.info(f"🤔 Received question: {question.question[:100]}...")
        start_time = time.time()
        
        # Get or create study session
        session_id = question.session_id
        if not session_id:
            # Create a new session
            conn = get_db_connection()
            cursor = conn.cursor()
            
            session_context = {
                "difficulty_preference": question.difficulty_preference,
                "auto_created": True
            }
            
            cursor.execute("""
                INSERT INTO study_sessions (course_id, session_context)
                VALUES (%s, %s) RETURNING id
            """, (question.course_id, Json(session_context)))
            
            session_id = cursor.fetchone()['id']
            conn.commit()
            cursor.close()
            conn.close()
        
        # Log the question
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_messages (session_id, message_type, content)
            VALUES (%s, 'question', %s) RETURNING id
        """, (session_id, question.question))
        
        question_message_id = cursor.fetchone()['id']
        
        # Update session question count
        cursor.execute("""
            UPDATE study_sessions 
            SET total_questions = total_questions + 1, updated_at = NOW()
            WHERE id = %s
        """, (session_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Find relevant content
        relevant_content = await study_engine.find_relevant_content(
            question.question,
            question.course_id,
            limit=5
        )
        
        # Generate intelligent response
        response_data = await study_engine.generate_intelligent_response(
            question.question,
            relevant_content,
            question.difficulty_preference
        )
        
        # Store the response
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chat_messages (
                session_id, message_type, content, sources, 
                response_time_ms, confidence_score, metadata
            ) VALUES (%s, 'answer', %s, %s, %s, %s, %s) RETURNING id
        """, (
            session_id,
            response_data['answer'],
            Json(response_data['sources']),
            response_data['response_time_ms'],
            response_data['confidence_score'],
            Json({"follow_ups": response_data['suggested_follow_ups']})
        ))
        
        answer_message_id = cursor.fetchone()['id']
        
        # Store source citations
        for source in response_data['sources']:
            cursor.execute("""
                INSERT INTO source_citations (
                    message_id, course_material_id, ai_processed_id, 
                    content_chunk, relevance_score, citation_context
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                answer_message_id,
                source['material_id'],
                source['ai_processed_id'],  # Already a string UUID, no need to convert
                source.get('relevant_chunk', '')[:1000],  # Truncate long chunks
                float(source['similarity_score']),  # Ensure Python float
                f"Referenced in response to: {question.question[:100]}"
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        total_time = int((time.time() - start_time) * 1000)
        logger.info(f"✅ Question answered in {total_time}ms with confidence: {response_data['confidence_score']:.2f}")
        
        # Schedule background analytics update
        background_tasks.add_task(update_learning_analytics, session_id, question.question, relevant_content)
        
        return ChatResponse(
            answer=response_data['answer'],
            sources=response_data['sources'],
            session_id=session_id,
            confidence_score=response_data['confidence_score'],
            response_time_ms=total_time,
            suggested_follow_ups=response_data['suggested_follow_ups']
        )
        
    except ContentNotFoundError as e:
        logger.warning(f"No content found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except AIProcessingError as e:
        logger.error(f"AI processing failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Question processing failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")

@app.get("/chat/session/{session_id}/history")
async def get_session_history(session_id: int, limit: int = 50):
    """Get conversation history for a study session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                cm.id,
                cm.message_type,
                cm.content,
                cm.sources,
                cm.confidence_score,
                cm.response_time_ms,
                cm.created_at,
                cm.metadata
            FROM chat_messages cm
            WHERE cm.session_id = %s
            ORDER BY cm.created_at ASC
            LIMIT %s
        """, (session_id, limit))
        
        messages = cursor.fetchall()
        
        # Get session info
        cursor.execute("""
            SELECT ss.*, c.title AS course_name
            FROM study_sessions ss
            LEFT JOIN course c ON ss.course_id = c.id
            WHERE ss.id = %s
        """, (session_id,))
        
        session_info = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not session_info:
            raise HTTPException(status_code=404, detail="Study session not found")
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_msg = {
                "id": msg['id'],
                "type": msg['message_type'],
                "content": msg['content'],
                "timestamp": msg['created_at'].isoformat(),
            }
            
            if msg['message_type'] == 'answer':
                formatted_msg.update({
                    "sources": msg['sources'] or [],
                    "confidence_score": msg['confidence_score'],
                    "response_time_ms": msg['response_time_ms'],
                    "metadata": msg['metadata']
                })
            
            formatted_messages.append(formatted_msg)
        
        return {
            "session_id": session_id,
            "session_info": {
                "course_name": session_info.get('course_name', 'General Study'),
                "created_at": session_info['created_at'].isoformat(),
                "total_questions": session_info['total_questions'],
                "context": session_info['session_context']
            },
            "messages": formatted_messages,
            "message_count": len(formatted_messages)
        }
        
    except Exception as e:
        logger.error(f"Failed to get session history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation history")

# Background Tasks
async def update_learning_analytics(session_id: int, question: str, relevant_content: List[Dict]):
    """Update learning analytics in the background"""
    try:
        # Extract topics and concepts from the question and content
        topics = set()
        concepts = set()
        
        for content in relevant_content[:3]:
            if 'key_concepts' in content:
                concepts.update(content['key_concepts'][:5])  # Top 5 concepts
        
        # Simple topic extraction (could be enhanced with NLP)
        question_lower = question.lower()
        if 'algorithm' in question_lower:
            topics.add('algorithms')
        if 'programming' in question_lower or 'code' in question_lower:
            topics.add('programming')
        if 'data' in question_lower:
            topics.add('data structures')
        
        # Update analytics (simplified for now)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get session info
        cursor.execute("SELECT course_id FROM study_sessions WHERE id = %s", (session_id,))
        session_result = cursor.fetchone()
        
        if session_result and session_result['course_id']:
            course_id = session_result['course_id']
            
            # Update or create learning analytics record
            for topic in topics:
                cursor.execute("""
                    INSERT INTO learning_analytics (
                        course_id, topic, questions_asked, concepts_covered, last_activity
                    ) VALUES (%s, %s, 1, %s, NOW())
                    ON CONFLICT (course_id, topic) 
                    DO UPDATE SET 
                        questions_asked = learning_analytics.questions_asked + 1,
                        concepts_covered = %s,
                        last_activity = NOW()
                """, (course_id, topic, list(concepts), list(concepts)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Analytics update failed: {e}")

@app.post("/study-guide/generate", response_model=StudyGuideResponse)
async def generate_study_guide(request: StudyGuideRequest, background_tasks: BackgroundTasks):
    """Generate comprehensive study guide for course topics"""
    try:
        logger.info(f"📚 Generating study guide for course {request.course_id}")
        start_time = time.time()
        
        # Get course name
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM course WHERE id = %s", (request.course_id,))
        course_result = cursor.fetchone()
        if not course_result:
            raise HTTPException(status_code=404, detail="Course not found")
        course_name = course_result['title']
        
        # Find relevant content for the topics
        relevant_content = []
        for topic in request.topics[:5]:  # Limit to 5 topics
            content = await study_engine.find_relevant_content(
                topic, request.course_id, limit=3
            )
            relevant_content.extend(content)
        
        # If no specific topics, get general course content
        if not request.topics:
            content = await study_engine.find_relevant_content(
                f"course overview {course_name}", request.course_id, limit=10
            )
            relevant_content.extend(content)
        
        # Generate study guide using AI
        ai_stack = await get_ai_stack()
        
        # Build context from course materials
        context_parts = []
        sources_used = []
        
        for i, content in enumerate(relevant_content[:8]):  # Top 8 most relevant
            context_parts.append(f"""
Section {i+1} - {content['title']} (Week {content.get('week_number', 'N/A')}):
{content.get('ai_summary', 'No summary available')}
Key Concepts: {', '.join(content.get('key_concepts', []))}
""")
            sources_used.append({
                "title": content['title'],
                "material_type": content['material_type'],
                "week_number": content.get('week_number'),
                "public_url": content.get('public_url'),
                "relevance": round((1 - content['similarity_score']) * 100, 1)
            })
        
        context_text = "\n".join(context_parts)
        topics_text = ", ".join(request.topics) if request.topics else "all course topics"
        
        prompt = f"""Create a comprehensive study guide for {course_name}.

Topics to focus on: {topics_text}
Difficulty level: {request.difficulty_level}

Course Materials Available:
{context_text}

Create a structured study guide with:
1. Overview/Introduction
2. Key Concepts (organized by topic)
3. Important Definitions
4. Examples and Applications
5. Study Tips
6. Review Questions

Make it appropriate for {request.difficulty_level} level students.
Format as clear sections with headings."""

        ai_response = await ai_stack.generate_llm_response(prompt)
        if not ai_response.get('success'):
            raise HTTPException(status_code=503, detail="Failed to generate study guide")
        
        # Structure the response into sections
        guide_content = ai_response['response']
        sections = []
        
        # Simple section parsing (could be enhanced)
        current_section = {"title": "Introduction", "content": ""}
        for line in guide_content.split('\n'):
            if line.strip() and (line.startswith('#') or line.startswith('##') or any(keyword in line.lower() for keyword in ['overview', 'concepts', 'definitions', 'examples', 'tips', 'questions'])):
                if current_section["content"].strip():
                    sections.append(current_section)
                current_section = {"title": line.strip('#').strip(), "content": ""}
            else:
                current_section["content"] += line + "\n"
        
        if current_section["content"].strip():
            sections.append(current_section)
        
        # Store in database
        cursor.execute("""
            INSERT INTO generated_study_materials (
                course_id, material_type, title, content, source_materials,
                generation_prompt, quality_score, usage_count
            ) VALUES (%s, 'study_guide', %s, %s, %s, %s, %s, 1) RETURNING id
        """, (
            request.course_id,
            f"Study Guide: {topics_text}",
            Json({"sections": sections, "topics": request.topics, "difficulty": request.difficulty_level}),
            Json(sources_used),
            prompt[:500],  # Truncate long prompts
            0.8  # Default quality score
        ))
        
        guide_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"✅ Study guide generated in {processing_time}ms with {len(sections)} sections")
        
        return StudyGuideResponse(
            guide_id=guide_id,
            course_name=course_name,
            title=f"Study Guide: {topics_text}",
            sections=sections,
            total_sections=len(sections),
            estimated_study_time=f"{len(sections) * 15-20} minutes",
            sources_used=sources_used,
            created_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Study guide generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate study guide")

@app.post("/flashcards/create", response_model=FlashcardsResponse)
async def create_flashcards(request: FlashcardsRequest, background_tasks: BackgroundTasks):
    """Generate flashcards for specific topic"""
    try:
        logger.info(f"🃏 Creating {request.count} flashcards for topic: {request.topic}")
        start_time = time.time()
        
        # Get course name
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM course WHERE id = %s", (request.course_id,))
        course_result = cursor.fetchone()
        if not course_result:
            raise HTTPException(status_code=404, detail="Course not found")
        course_name = course_result['title']
        
        # Find relevant content for the topic
        relevant_content = await study_engine.find_relevant_content(
            request.topic, request.course_id, limit=5
        )
        
        if not relevant_content:
            raise HTTPException(status_code=404, detail=f"No course content found for topic: {request.topic}")
        
        # Generate flashcards using AI
        ai_stack = await get_ai_stack()
        
        # Build context
        context_parts = []
        sources_used = []
        
        for content in relevant_content[:3]:  # Top 3 most relevant
            context_parts.append(f"""
Content: {content['title']}
Summary: {content.get('ai_summary', 'No summary')}
Key Concepts: {', '.join(content.get('key_concepts', []))}
Text Sample: {content['relevant_chunk'][:300]}...
""")
            sources_used.append({
                "title": content['title'],
                "material_type": content['material_type'],
                "week_number": content.get('week_number'),
                "public_url": content.get('public_url'),
                "relevance": round((1 - content['similarity_score']) * 100, 1)
            })
        
        context_text = "\n".join(context_parts)
        
        prompt = f"""Create exactly {request.count} flashcards about "{request.topic}" for {course_name}.

Course Materials:
{context_text}

Difficulty level: {request.difficulty_level}

Requirements:
- Each flashcard should have a clear FRONT (question) and BACK (answer)
- Questions should test key concepts, definitions, or applications
- Answers should be concise but complete
- Appropriate for {request.difficulty_level} level students
- Focus specifically on "{request.topic}"

Format each flashcard exactly like this:
CARD 1:
FRONT: [Question]
BACK: [Answer]

CARD 2:
FRONT: [Question]  
BACK: [Answer]

Continue for all {request.count} cards."""

        ai_response = await ai_stack.generate_llm_response(prompt)
        if not ai_response.get('success'):
            raise HTTPException(status_code=503, detail="Failed to generate flashcards")
        
        # Parse flashcards from response
        cards = []
        content = ai_response['response']
        
        # Simple parsing (could be enhanced with regex)
        lines = content.split('\n')
        current_card = {}
        
        for line in lines:
            line = line.strip()
            if line.startswith('FRONT:'):
                current_card['front'] = line.replace('FRONT:', '').strip()
            elif line.startswith('BACK:'):
                current_card['back'] = line.replace('BACK:', '').strip()
                if 'front' in current_card:
                    cards.append(current_card)
                    current_card = {}
        
        # Ensure we have the requested number of cards
        if len(cards) < request.count:
            # Fallback: create simple definition cards
            for i in range(request.count - len(cards)):
                cards.append({
                    "front": f"Define or explain: {request.topic} (Card {len(cards) + 1})",
                    "back": f"Key concept related to {request.topic} from {course_name}"
                })
        
        cards = cards[:request.count]  # Limit to requested count
        
        # Store in database
        cursor.execute("""
            INSERT INTO generated_study_materials (
                course_id, material_type, title, content, source_materials,
                generation_prompt, quality_score, usage_count
            ) VALUES (%s, 'flashcards', %s, %s, %s, %s, %s, 1) RETURNING id
        """, (
            request.course_id,
            f"Flashcards: {request.topic}",
            Json({"cards": cards, "topic": request.topic, "difficulty": request.difficulty_level}),
            Json(sources_used),
            prompt[:500],
            0.8
        ))
        
        flashcards_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"✅ Generated {len(cards)} flashcards in {processing_time}ms")
        
        return FlashcardsResponse(
            flashcards_id=flashcards_id,
            course_name=course_name,
            topic=request.topic,
            cards=cards,
            total_cards=len(cards),
            sources_used=sources_used,
            created_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Flashcard creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create flashcards")

@app.post("/quiz/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest, background_tasks: BackgroundTasks):
    """Generate practice quiz for course topics"""
    try:
        logger.info(f"📝 Generating quiz with {request.question_count} questions")
        start_time = time.time()
        
        # Get course name
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM course WHERE id = %s", (request.course_id,))
        course_result = cursor.fetchone()
        if not course_result:
            raise HTTPException(status_code=404, detail="Course not found")
        course_name = course_result['title']
        
        # Find relevant content
        relevant_content = []
        if request.topics:
            for topic in request.topics[:3]:  # Limit topics
                content = await study_engine.find_relevant_content(
                    topic, request.course_id, limit=3
                )
                relevant_content.extend(content)
        else:
            # General course quiz
            content = await study_engine.find_relevant_content(
                f"course content {course_name}", request.course_id, limit=8
            )
            relevant_content.extend(content)
        
        if not relevant_content:
            raise HTTPException(status_code=404, detail="No course content found for quiz generation")
        
        # Generate quiz using AI
        ai_stack = await get_ai_stack()
        
        # Build context
        context_parts = []
        sources_used = []
        
        for content in relevant_content[:5]:  # Top 5 most relevant
            context_parts.append(f"""
Material: {content['title']} (Week {content.get('week_number', 'N/A')})
Summary: {content.get('ai_summary', 'No summary')}
Key Concepts: {', '.join(content.get('key_concepts', []))}
""")
            sources_used.append({
                "title": content['title'],
                "material_type": content['material_type'],
                "week_number": content.get('week_number'),
                "public_url": content.get('public_url'),
                "relevance": round((1 - content['similarity_score']) * 100, 1)
            })
        
        context_text = "\n".join(context_parts)
        topics_text = ", ".join(request.topics) if request.topics else "all course topics"
        question_types_text = ", ".join(request.question_types)
        
        prompt = f"""Create a {request.question_count}-question quiz for {course_name}.

Topics: {topics_text}
Question types: {question_types_text}
Difficulty: {request.difficulty_level}

Course Materials:
{context_text}

Requirements:
- Create exactly {request.question_count} questions
- Use question types: {question_types_text}
- Questions should test understanding of key concepts
- Include correct answers
- For multiple choice: provide 4 options (A, B, C, D)
- For short answer: provide sample correct answer
- Appropriate for {request.difficulty_level} level

Format each question like this:
QUESTION 1:
Type: multiple_choice
Question: [Question text]
A) [Option A]
B) [Option B] 
C) [Option C]
D) [Option D]
Correct Answer: B
Explanation: [Brief explanation]

Or for short answer:
QUESTION 2:
Type: short_answer
Question: [Question text]
Sample Answer: [Expected answer]
Explanation: [Brief explanation]"""

        ai_response = await ai_stack.generate_llm_response(prompt)
        if not ai_response.get('success'):
            raise HTTPException(status_code=503, detail="Failed to generate quiz")
        
        # Parse questions from response
        questions = []
        content = ai_response['response']
        
        # Simple parsing for questions
        question_blocks = content.split('QUESTION ')[1:]  # Skip first empty element
        
        for i, block in enumerate(question_blocks[:request.question_count]):
            lines = block.strip().split('\n')
            question_data = {
                "question_number": i + 1,
                "type": "multiple_choice",  # Default
                "question": "",
                "options": [],
                "correct_answer": "",
                "explanation": ""
            }
            
            for line in lines:
                line = line.strip()
                if line.startswith('Type:'):
                    question_data['type'] = line.replace('Type:', '').strip()
                elif line.startswith('Question:'):
                    question_data['question'] = line.replace('Question:', '').strip()
                elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                    question_data['options'].append(line)
                elif line.startswith('Correct Answer:'):
                    question_data['correct_answer'] = line.replace('Correct Answer:', '').strip()
                elif line.startswith('Sample Answer:'):
                    question_data['correct_answer'] = line.replace('Sample Answer:', '').strip()
                elif line.startswith('Explanation:'):
                    question_data['explanation'] = line.replace('Explanation:', '').strip()
            
            if question_data['question']:
                questions.append(question_data)
        
        # Ensure we have the requested number of questions
        while len(questions) < request.question_count:
            questions.append({
                "question_number": len(questions) + 1,
                "type": "short_answer",
                "question": f"Explain a key concept from {topics_text}",
                "options": [],
                "correct_answer": "Student should demonstrate understanding of course concepts",
                "explanation": "Open-ended question to test comprehension"
            })
        
        questions = questions[:request.question_count]
        
        # Store in database
        cursor.execute("""
            INSERT INTO generated_study_materials (
                course_id, material_type, title, content, source_materials,
                generation_prompt, quality_score, usage_count
            ) VALUES (%s, 'quiz', %s, %s, %s, %s, %s, 1) RETURNING id
        """, (
            request.course_id,
            f"Quiz: {topics_text}",
            Json({"questions": questions, "topics": request.topics, "difficulty": request.difficulty_level}),
            Json(sources_used),
            prompt[:500],
            0.8
        ))
        
        quiz_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()
        
        processing_time = int((time.time() - start_time) * 1000)
        estimated_time = f"{request.question_count * 2-3} minutes"
        
        logger.info(f"✅ Generated quiz with {len(questions)} questions in {processing_time}ms")
        
        return QuizResponse(
            quiz_id=quiz_id,
            course_name=course_name,
            title=f"Quiz: {topics_text}",
            questions=questions,
            total_questions=len(questions),
            estimated_time=estimated_time,
            sources_used=sources_used,
            created_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

# Exception Handlers
@app.exception_handler(StudyBuddyError)
async def study_buddy_exception_handler(request: Request, exc: StudyBuddyError):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(ContentNotFoundError)
async def content_not_found_handler(request: Request, exc: ContentNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "suggestion": "Try rephrasing your question or ask about different course topics",
            "timestamp": datetime.now().isoformat()
        }
    )

@app.post("/exam/generate", response_model=ExamGenerateResponse)
async def generate_exam(request: ExamGenerateRequest, background_tasks: BackgroundTasks):
    """Generate comprehensive exam for a course"""
    try:
        logger.info(f"📝 Generating {request.exam_type} exam with {request.question_count} questions for course {request.course_id}")
        start_time = time.time()
        
        # Get course name
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Convert course_id string to UUID if needed
        try:
            import uuid as uuid_lib
            course_uuid = uuid_lib.UUID(request.course_id) if isinstance(request.course_id, str) else request.course_id
        except (ValueError, AttributeError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid course_id format: {request.course_id}")
        
        cursor.execute("SELECT title FROM course WHERE id = %s", (str(course_uuid),))
        course_result = cursor.fetchone()
        if not course_result:
            raise HTTPException(status_code=404, detail=f"Course not found with id: {request.course_id}")
        course_name = course_result['title']
        
        # Get course materials based on weeks covered
        weeks_list = []
        if request.weeks_covered:
            weeks_list = [int(w.strip()) for w in request.weeks_covered.split(',') if w.strip().isdigit()]
        
        # Find relevant content
        relevant_content = []
        if weeks_list:
            for week in weeks_list:
                cursor.execute("""
                    SELECT cm.id, cm.title, cm.material_type, cm.week_number,
                           apc.ai_summary, apc.key_concepts, cm.content_url as public_url
                    FROM course_material cm
                    LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                    WHERE cm.course_id = %s AND cm.week_number = %s AND cm.is_public = true
                    ORDER BY cm.created_at
                    LIMIT 5
                """, (request.course_id, week))
                relevant_content.extend(cursor.fetchall())
        else:
            # Get all course materials
            cursor.execute("""
                SELECT cm.id, cm.title, cm.material_type, cm.week_number,
                       apc.ai_summary, apc.key_concepts, cm.content_url as public_url
                FROM course_material cm
                LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                WHERE cm.course_id = %s AND cm.is_public = true
                ORDER BY cm.week_number, cm.created_at
                LIMIT 20
            """, (request.course_id,))
            relevant_content.extend(cursor.fetchall())
        
        if not relevant_content:
            raise HTTPException(status_code=404, detail="No course content found for exam generation")
        
        # Generate exam using AI
        ai_stack = await get_ai_stack()
        
        # Build context
        context_parts = []
        for content in relevant_content[:15]:  # Top 15 most relevant
            context_parts.append(f"""
Material: {content['title']} (Week {content.get('week_number', 'N/A')})
Type: {content['material_type']}
Summary: {content.get('ai_summary', 'No summary')[:500]}
Key Concepts: {', '.join(content.get('key_concepts', [])[:10]) if content.get('key_concepts') else 'N/A'}
""")
        
        context_text = "\n".join(context_parts)
        
        # Calculate question distribution
        total_questions = request.question_count
        question_distribution = {}
        for qtype, ratio in request.question_types.items():
            question_distribution[qtype] = int(total_questions * ratio)
        
        # Adjust for rounding
        total_distributed = sum(question_distribution.values())
        if total_distributed < total_questions:
            question_distribution[list(question_distribution.keys())[0]] += (total_questions - total_distributed)
        
        prompt = f"""Create a comprehensive {request.exam_type} exam for {course_name} with {total_questions} questions.

Exam Type: {request.exam_type.upper()}
Difficulty Mix: {', '.join([f'{k}: {int(v*100)}%' for k, v in request.difficulty_mix.items()])}
Question Types: {', '.join([f'{k}: {count} questions' for k, count in question_distribution.items()])}

Course Materials:
{context_text}

Requirements:
- Create EXACTLY {total_questions} questions total
- Question type distribution: {question_distribution}
- Difficulty distribution: {request.difficulty_mix}
- Questions should comprehensively test understanding of course materials
- Include correct answers and explanations
- For multiple choice: provide 4 options (A, B, C, D)
- For short answer: provide sample correct answer
- Questions should range from recall to application and analysis

Format each question like this:
QUESTION 1:
Type: multiple_choice
Difficulty: medium
Question: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: B
Explanation: [Brief explanation of why B is correct]
Topic: [Related topic from materials]

Or for short answer:
QUESTION 2:
Type: short_answer
Difficulty: hard
Question: [Question text]
Sample Answer: [Expected answer]
Explanation: [Brief explanation]
Topic: [Related topic from materials]

Generate all {total_questions} questions now."""

        ai_response = await ai_stack.generate_llm_response(prompt)
        if not ai_response.get('success'):
            raise HTTPException(status_code=503, detail="Failed to generate exam")
        
        # Parse questions from response
        questions_text = ai_response.get('content', '')
        questions = []
        questions_with_answers = []
        
        # Simple parsing (you may want to improve this)
        question_blocks = questions_text.split('QUESTION ')[1:]
        
        for i, block in enumerate(question_blocks[:total_questions], 1):
            lines = block.strip().split('\n')
            question_data = {
                'question_number': i,
                'type': 'multiple_choice',
                'difficulty': 'medium',
                'question': '',
                'options': {},
                'topic': ''
            }
            
            current_section = None
            for line in lines:
                line = line.strip()
                if line.startswith('Type:'):
                    question_data['type'] = line.split(':', 1)[1].strip()
                elif line.startswith('Difficulty:'):
                    question_data['difficulty'] = line.split(':', 1)[1].strip()
                elif line.startswith('Question:'):
                    question_data['question'] = line.split(':', 1)[1].strip()
                elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                    option_letter = line[0]
                    option_text = line.split(')', 1)[1].strip()
                    question_data['options'][option_letter] = option_text
                elif line.startswith('Correct Answer:'):
                    question_data['correct_answer'] = line.split(':', 1)[1].strip()
                elif line.startswith('Sample Answer:'):
                    question_data['sample_answer'] = line.split(':', 1)[1].strip()
                elif line.startswith('Explanation:'):
                    question_data['explanation'] = line.split(':', 1)[1].strip()
                elif line.startswith('Topic:'):
                    question_data['topic'] = line.split(':', 1)[1].strip()
            
            # Create version without answers
            question_without_answer = question_data.copy()
            question_without_answer.pop('correct_answer', None)
            question_without_answer.pop('sample_answer', None)
            question_without_answer.pop('explanation', None)
            
            questions.append(question_without_answer)
            questions_with_answers.append(question_data)
        
        # Generate exam ID
        exam_id = str(uuid.uuid4())
        
        # Create grading rubric
        total_points = 100
        points_per_question = total_points / len(questions_with_answers) if questions_with_answers else 0
        grading_rubric = {
            "total_points": total_points,
            "total_questions": len(questions_with_answers),
            "points_per_question": round(points_per_question, 2),
            "grading_scale": {
                "A": {"min": 90, "max": 100},
                "B": {"min": 80, "max": 89},
                "C": {"min": 70, "max": 79},
                "D": {"min": 60, "max": 69},
                "F": {"min": 0, "max": 59}
            }
        }
        
        # Store exam in database
        cursor.execute("""
            INSERT INTO generated_exams (id, course_id, exam_type, questions, created_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING
        """, (exam_id, request.course_id, request.exam_type, Json(questions_with_answers)))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"✅ Exam generated in {processing_time}ms")
        
        return ExamGenerateResponse(
            exam_id=exam_id,
            course_name=course_name,
            exam_type=request.exam_type,
            questions=questions,
            questions_with_answers=questions_with_answers,
            total_questions=len(questions),
            grading_rubric=grading_rubric,
            created_at=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating exam: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate exam: {str(e)}")


@app.post("/exam/submit", response_model=ExamSubmitResponse)
async def submit_exam(request: ExamSubmitRequest):
    """Submit and grade exam answers"""
    try:
        logger.info(f"📝 Grading exam {request.exam_id} for student {request.student_id}")
        
        # Retrieve exam from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT questions, exam_type FROM generated_exams WHERE id = %s
        """, (request.exam_id,))
        exam_result = cursor.fetchone()
        
        if not exam_result:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        questions_with_answers = exam_result['questions']
        exam_type = exam_result['exam_type']
        
        # Grade the exam
        correct_answers = 0
        per_question_results = []
        weak_topics = []
        
        for question in questions_with_answers:
            q_num = question['question_number']
            student_answer = request.answers.get(q_num, '')
            correct_answer = question.get('correct_answer', question.get('sample_answer', ''))
            
            is_correct = False
            if question['type'] == 'multiple_choice':
                is_correct = student_answer.strip().upper() == correct_answer.strip().upper()
            else:
                # For short answer, do basic similarity check
                is_correct = student_answer.strip().lower() in correct_answer.lower() or \
                             correct_answer.lower() in student_answer.strip().lower()
            
            if is_correct:
                correct_answers += 1
            else:
                weak_topics.append(question.get('topic', 'Unknown topic'))
            
            per_question_results.append({
                'question_number': q_num,
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': question.get('explanation', '')
            })
        
        # Calculate score
        total_questions = len(questions_with_answers)
        score_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
        
        # Assign grade
        if score_percentage >= 90:
            grade = 'A'
        elif score_percentage >= 80:
            grade = 'B'
        elif score_percentage >= 70:
            grade = 'C'
        elif score_percentage >= 60:
            grade = 'D'
        else:
            grade = 'F'
        
        # Generate recommendations
        recommendations = []
        if score_percentage < 70:
            recommendations.append(f"Review course materials on: {', '.join(set(weak_topics[:5]))}")
            recommendations.append("Consider scheduling study sessions with classmates")
            recommendations.append("Reach out to instructor during office hours")
        elif score_percentage < 85:
            recommendations.append(f"Focus on improving understanding of: {', '.join(set(weak_topics[:3]))}")
            recommendations.append("Practice more problems on weak areas")
        else:
            recommendations.append("Great job! Keep up the good work")
            recommendations.append("Consider helping peers who may be struggling")
        
        # Store submission
        cursor.execute("""
            INSERT INTO exam_submissions (exam_id, student_id, answers, score_percentage, grade, submitted_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (request.exam_id, request.student_id, Json(request.answers), score_percentage, grade))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Exam graded: {score_percentage:.1f}% ({grade})")
        
        return ExamSubmitResponse(
            exam_id=request.exam_id,
            student_id=request.student_id,
            score_percentage=round(score_percentage, 2),
            correct_answers=correct_answers,
            total_questions=total_questions,
            grade=grade,
            per_question_results=per_question_results,
            weak_areas=list(set(weak_topics)),
            recommendations=recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit exam: {str(e)}")


@app.exception_handler(AIProcessingError)
async def ai_processing_exception_handler(request: Request, exc: AIProcessingError):
    return JSONResponse(
        status_code=503,
        content={
            "error": exc.error_code,
            "message": "AI processing service temporarily unavailable",
            "timestamp": datetime.now().isoformat()
        }
    )

# Development Server
if __name__ == "__main__":
    import uvicorn
    logger.info("🎓 Starting MIVA Study Buddy API in development mode...")
    uvicorn.run(
        "study_buddy_api:app",
        host="0.0.0.0",
        port=8083,
        reload=True,
        log_level="info"
    )
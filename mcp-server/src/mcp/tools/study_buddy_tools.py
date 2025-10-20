"""Study Buddy Tools for MIVA Academic MCP Server"""

import json
import sys
import os
import httpx
import logging
from typing import Optional, Dict, Any, List

# Set up logging
logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import usage tracking
from core.usage_tracker import usage_tracker, create_usage_error_response

STUDY_BUDDY_API_BASE = "http://localhost:8083"

def register_study_buddy_tools(mcp):
    """Register all study buddy tools with the MCP server"""
    
    @mcp.tool()
    async def ask_study_question(
        question: str,
        course_id: Optional[int] = None,
        difficulty_level: str = "medium",
        student_id: Optional[str] = None
    ) -> str:
        """Ask an intelligent study question and get answers using course materials with citations and follow-up suggestions.
        
        Gets AI-powered answers to study questions using course materials with source citations,
        confidence scores, and suggested follow-up questions.
        
        Args:
            question: The study question to ask (e.g., 'What are loops in programming?')
            course_id: Course ID to focus the question on (1=CS, 2=Math, etc.). Optional.
            difficulty_level: Adjust answer complexity - beginner, medium, or advanced
            student_id: Student ID for usage tracking
            
        Returns:
            Formatted study answer with sources and follow-up suggestions
        """
        # Check usage limit before processing
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "ai_messages_per_day", "daily"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "ask_study_question")
        logger.info(f"🔍 [ask_study_question] Called with:")
        logger.info(f"   - Question: '{question[:100]}{'...' if len(question) > 100 else ''}'")
        logger.info(f"   - Course ID: {course_id}")
        logger.info(f"   - Difficulty: {difficulty_level}")
        logger.info(f"   - Target API: {STUDY_BUDDY_API_BASE}")
        
        try:
            # First start a session if we have a course_id
            session_data = None
            if course_id:
                logger.info(f"📝 Starting study session for course {course_id}...")
                try:
                    async with httpx.AsyncClient() as client:
                        session_url = f"{STUDY_BUDDY_API_BASE}/chat/session/start"
                        session_payload = {
                            "course_id": course_id,
                            "learning_goals": ["answer student questions"],
                            "difficulty_preference": difficulty_level
                        }
                        logger.info(f"   - POST {session_url}")
                        logger.info(f"   - Payload: {json.dumps(session_payload, indent=2)}")
                        
                        session_response = await client.post(
                            session_url,
                            json=session_payload,
                            timeout=30.0
                        )
                        
                        logger.info(f"   - Response status: {session_response.status_code}")
                        logger.info(f"   - Response body: {session_response.text[:500]}")
                        
                        if session_response.status_code == 200:
                            session_data = session_response.json()
                            logger.info(f"   ✅ Session created: {session_data.get('session_id')}")
                        else:
                            logger.warning(f"   ⚠️ Session creation failed, continuing without session")
                except Exception as session_error:
                    logger.error(f"   ❌ Session creation error: {type(session_error).__name__}: {str(session_error)}")
                    logger.warning(f"   Continuing without session...")
            
            # Ask the question
            logger.info(f"💬 Sending question to Study Buddy API...")
            async with httpx.AsyncClient() as client:
                payload = {
                    "question": question,
                    "difficulty_preference": difficulty_level
                }
                if course_id:
                    payload["course_id"] = course_id
                if session_data:
                    payload["session_id"] = session_data["session_id"]
                
                ask_url = f"{STUDY_BUDDY_API_BASE}/chat/ask"
                logger.info(f"   - POST {ask_url}")
                logger.info(f"   - Payload: {json.dumps(payload, indent=2)}")
                logger.info(f"   - Timeout: 60.0s")
                
                response = await client.post(
                    ask_url,
                    json=payload,
                    timeout=60.0
                )
                
                logger.info(f"   - Response status: {response.status_code}")
                logger.info(f"   - Response headers: {dict(response.headers)}")
                logger.info(f"   - Response body: {response.text[:1000]}")
                
                if response.status_code != 200:
                    error_msg = f"❌ Error asking question: {response.status_code} {response.text}"
                    logger.error(f"   {error_msg}")
                    return error_msg
                
                result = response.json()
                logger.info(f"   ✅ Received response with {len(result.get('sources', []))} sources")
                logger.info(f"   - Confidence: {result.get('confidence_score', 0):.2f}")
                logger.info(f"   - Response time: {result.get('response_time_ms', 0)}ms")
                
                # Format the response nicely
                answer_text = f"## 📚 Study Buddy Answer\n\n{result['answer']}\n\n"
                logger.info(f"   Formatting answer with {len(answer_text)} characters...")
                
                # Add confidence score
                if result.get('confidence_score'):
                    confidence_percent = int(result['confidence_score'] * 100)
                    answer_text += f"**Confidence Score:** {confidence_percent}%\n\n"
                
                # Add sources if available
                if result.get('sources') and len(result['sources']) > 0:
                    answer_text += "### 📖 Referenced Course Materials:\n\n"
                    for i, source in enumerate(result['sources'][:3], 1):
                        relevance = int((1 - source['similarity_score']) * 100)
                        answer_text += f"{i}. **{source['title']}**\n"
                        answer_text += f"   - Week {source.get('week_number', 'N/A')} • {source['material_type']} • {relevance}% relevant\n"
                        if source.get('public_url'):
                            answer_text += f"   - 🔗 [View Material]({source['public_url']})\n"
                        answer_text += "\n"
                
                # Add follow-up suggestions
                if result.get('suggested_follow_ups'):
                    answer_text += "### 💡 Suggested Follow-up Questions:\n\n"
                    for suggestion in result['suggested_follow_ups']:
                        answer_text += f"- {suggestion}\n"
                
                # Add session info if available
                if session_data:
                    answer_text += f"\n---\n*Study session: {session_data['course_name']} (Session ID: {session_data['session_id']})*"
                
                logger.info(f"✅ Successfully processed question, returning formatted answer")
                
                # Record usage after successful execution
                if student_id:
                    await usage_tracker.record_usage_after_success(
                        student_id, "ai_messages_per_day", "daily"
                    )
                
                return answer_text
            
        except httpx.TimeoutException as timeout_error:
            error_msg = "⏱️ Request timed out. The Study Buddy API might be processing a complex question. Please try again."
            logger.error(f"❌ Timeout error: {str(timeout_error)}")
            logger.error(f"   {error_msg}")
            return error_msg
        except httpx.ConnectError as connect_error:
            error_msg = f"🔌 Cannot connect to Study Buddy API at {STUDY_BUDDY_API_BASE}. Is the service running?"
            logger.error(f"❌ Connection error: {type(connect_error).__name__}: {str(connect_error)}")
            logger.error(f"   {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = f"❌ Error asking study question: {type(e).__name__}: {str(e)}"
            logger.error(error_msg)
            logger.exception("Full traceback:")
            return error_msg
    
    @mcp.tool()
    async def generate_study_guide(
        course_id: str,
        topics: str = "",
        difficulty_level: str = "medium",
        weeks: str = "",
        student_id: Optional[str] = None
    ) -> str:
        """Generate comprehensive study guide for course topics.
        
        Creates AI-powered study guides with structured sections, key concepts, 
        definitions, examples, and review questions based on course materials.
        
        Args:
            course_id: Course ID (UUID string) to generate study guide for
            topics: Comma-separated topics to focus on (e.g., "algorithms, data structures"). Leave empty for all topics.
            difficulty_level: Complexity level - beginner, medium, or advanced
            weeks: Comma-separated week numbers to include (e.g., "1,3,5"). Leave empty for all weeks.
            student_id: Student ID for usage tracking
            
        Returns:
            Formatted study guide with sections and source materials
        """
        # Check usage limit before processing
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "study_guides_per_week", "weekly"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "generate_study_guide")
        try:
            # Parse topics and weeks
            topics_list = [t.strip() for t in topics.split(",") if t.strip()] if topics else []
            weeks_list = []
            if weeks:
                try:
                    weeks_list = [int(w.strip()) for w in weeks.split(",") if w.strip().isdigit()]
                except ValueError:
                    pass
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "course_id": course_id,
                    "topics": topics_list,
                    "difficulty_level": difficulty_level,
                    "weeks": weeks_list
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/study-guide/generate",
                    json=payload,
                    timeout=90.0  # Longer timeout for complex generation
                )
                
                if response.status_code != 200:
                    return f"❌ Error generating study guide: {response.status_code} {response.text}"
                
                result = response.json()
                
                # Format the response nicely
                guide_text = f"## 📚 Study Guide: {result['title']}\n\n"
                guide_text += f"**Course:** {result['course_name']}\n"
                guide_text += f"**Sections:** {result['total_sections']}\n"
                guide_text += f"**Estimated Study Time:** {result['estimated_study_time']}\n\n"
                
                # Add sections
                for i, section in enumerate(result['sections'], 1):
                    guide_text += f"### {i}. {section['title']}\n\n"
                    guide_text += f"{section['content']}\n\n"
                
                # Add sources
                if result.get('sources_used'):
                    guide_text += "### 📖 Source Materials:\n\n"
                    for source in result['sources_used'][:5]:  # Limit to top 5
                        guide_text += f"- **{source['title']}** ({source['material_type']}) - Week {source.get('week_number', 'N/A')} • {source['relevance']}% relevant"
                        if source.get('public_url'):
                            guide_text += f" - 🔗 [View]({source['public_url']})"
                        guide_text += "\n"
                
                guide_text += f"\n---\n*Generated: {result['created_at']} • Guide ID: {result['guide_id']}*"
                
                # Record usage after successful execution
                if student_id:
                    await usage_tracker.record_usage_after_success(
                        student_id, "study_guides_per_week", "weekly"
                    )
                
                return guide_text
            
        except httpx.TimeoutException:
            return "⏱️ Study guide generation timed out. This is a complex process - please try again."
        except Exception as e:
            return f"❌ Error generating study guide: {str(e)}"
    
    @mcp.tool()
    async def create_flashcards(
        course_id: str,
        topic: str,
        count: int = 10,
        difficulty_level: str = "medium",
        student_id: Optional[str] = None
    ) -> str:
        """Create flashcards for specific course topic.
        
        Generates AI-powered flashcards with questions and answers based on 
        course materials. Perfect for memorization and quick review.
        
        Args:
            topic: Specific topic for flashcards (e.g., "binary search trees")
            course_id: Course ID to generate flashcards for  
            count: Number of flashcards to generate (5-50, default: 10)
            difficulty_level: Complexity level - beginner, medium, or advanced
            student_id: Student ID for usage tracking
            
        Returns:
            Formatted flashcards with front/back pairs and source materials
        """
        # Check usage limit before processing
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "flashcard_sets_per_week", "weekly"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "create_flashcards")
        try:
            # Validate count
            count = max(5, min(50, count))
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "course_id": course_id,
                    "topic": topic,
                    "count": count,
                    "difficulty_level": difficulty_level
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/flashcards/create",
                    json=payload,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    return f"❌ Error creating flashcards: {response.status_code} {response.text}"
                
                result = response.json()
                
                # Format the response nicely
                cards_text = f"## 🃏 Flashcards: {result['topic']}\n\n"
                cards_text += f"**Course:** {result['course_name']}\n"
                cards_text += f"**Topic:** {result['topic']}\n"
                cards_text += f"**Total Cards:** {result['total_cards']}\n\n"
                
                # Add flashcards
                for i, card in enumerate(result['cards'], 1):
                    cards_text += f"### Card {i}\n\n"
                    cards_text += f"**🤔 Front (Question):**\n{card['front']}\n\n"
                    cards_text += f"**✅ Back (Answer):**\n{card['back']}\n\n"
                    cards_text += "---\n\n"
                
                # Add sources
                if result.get('sources_used'):
                    cards_text += "### 📖 Source Materials:\n\n"
                    for source in result['sources_used'][:3]:  # Limit to top 3
                        cards_text += f"- **{source['title']}** ({source['material_type']}) - Week {source.get('week_number', 'N/A')} • {source['relevance']}% relevant"
                        if source.get('public_url'):
                            cards_text += f" - 🔗 [View]({source['public_url']})"
                        cards_text += "\n"
                
                cards_text += f"\n---\n*Generated: {result['created_at']} • Flashcards ID: {result['flashcards_id']}*"
                
                # Record usage after successful execution
                if student_id:
                    await usage_tracker.record_usage_after_success(
                        student_id, "flashcard_sets_per_week", "weekly"
                    )
                
                return cards_text
            
        except httpx.TimeoutException:
            return "⏱️ Flashcard creation timed out. Please try again."
        except Exception as e:
            return f"❌ Error creating flashcards: {str(e)}"
    
    @mcp.tool()
    async def generate_quiz(
        course_id: str,
        topics: str = "",
        question_count: int = 10,
        question_types: str = "multiple_choice",
        difficulty_level: str = "medium",
        student_id: Optional[str] = None
    ) -> str:
        """Generate practice quiz for course topics.
        
        Creates AI-powered quizzes with various question types based on course 
        materials. Includes correct answers and explanations.
        
        Args:
            course_id: Course ID to generate quiz for
            topics: Comma-separated topics to quiz on (e.g., "loops, functions"). Leave empty for all topics.
            question_count: Number of questions to generate (5-25, default: 10)
            question_types: Comma-separated question types: multiple_choice, short_answer, essay (default: multiple_choice)
            difficulty_level: Complexity level - beginner, medium, or advanced
            student_id: Student ID for usage tracking
            
        Returns:
            Formatted quiz with questions, answers, and source materials
        """
        # Check usage limit before processing
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "quizzes_per_week", "weekly"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "generate_quiz")
        try:
            # Validate and parse inputs
            question_count = max(5, min(25, question_count))
            topics_list = [t.strip() for t in topics.split(",") if t.strip()] if topics else []
            types_list = [t.strip() for t in question_types.split(",") if t.strip()] if question_types else ["multiple_choice"]
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "course_id": course_id,
                    "topics": topics_list,
                    "question_count": question_count,
                    "question_types": types_list,
                    "difficulty_level": difficulty_level
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/quiz/generate",
                    json=payload,
                    timeout=90.0  # Longer timeout for complex generation
                )
                
                if response.status_code != 200:
                    return f"❌ Error generating quiz: {response.status_code} {response.text}"
                
                result = response.json()
                
                # Format the response nicely
                quiz_text = f"## 📝 Quiz: {result['title']}\n\n"
                quiz_text += f"**Course:** {result['course_name']}\n"
                quiz_text += f"**Questions:** {result['total_questions']}\n"
                quiz_text += f"**Estimated Time:** {result['estimated_time']}\n\n"
                
                # Add questions
                for question in result['questions']:
                    quiz_text += f"### Question {question['question_number']}\n\n"
                    quiz_text += f"**Type:** {question['type']}\n\n"
                    quiz_text += f"**Question:** {question['question']}\n\n"
                    
                    if question.get('options') and len(question['options']) > 0:
                        quiz_text += "**Options:**\n"
                        for option in question['options']:
                            quiz_text += f"- {option}\n"
                        quiz_text += "\n"
                    
                    quiz_text += f"**Correct Answer:** {question['correct_answer']}\n\n"
                    
                    if question.get('explanation'):
                        quiz_text += f"**Explanation:** {question['explanation']}\n\n"
                    
                    quiz_text += "---\n\n"
                
                # Add sources
                if result.get('sources_used'):
                    quiz_text += "### 📖 Source Materials:\n\n"
                    for source in result['sources_used'][:5]:  # Limit to top 5
                        quiz_text += f"- **{source['title']}** ({source['material_type']}) - Week {source.get('week_number', 'N/A')} • {source['relevance']}% relevant"
                        if source.get('public_url'):
                            quiz_text += f" - 🔗 [View]({source['public_url']})"
                        quiz_text += "\n"
                
                quiz_text += f"\n---\n*Generated: {result['created_at']} • Quiz ID: {result['quiz_id']}*"
                
                # Record usage after successful execution
                if student_id:
                    await usage_tracker.record_usage_after_success(
                        student_id, "quizzes_per_week", "weekly"
                    )
                
                return quiz_text
            
        except httpx.TimeoutException:
            return "⏱️ Quiz generation timed out. This is a complex process - please try again."
        except Exception as e:
            return f"❌ Error generating quiz: {str(e)}"



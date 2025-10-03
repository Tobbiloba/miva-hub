"""Study Buddy Tools for MIVA Academic MCP Server"""

import json
import sys
import os
import httpx
from typing import Optional, Dict, Any, List

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

STUDY_BUDDY_API_BASE = "http://localhost:8083"

def register_study_buddy_tools(mcp):
    """Register all study buddy tools with the MCP server"""
    
    @mcp.tool()
    async def ask_study_question(
        question: str,
        course_id: str | None = None,
        difficulty_level: str = "medium"
    ) -> str:
        """Ask an intelligent study question and get answers using course materials with citations and follow-up suggestions.
        
        Gets AI-powered answers to study questions using course materials with source citations,
        confidence scores, and suggested follow-up questions.
        
        Args:
            question: The study question to ask (e.g., 'What are loops in programming?')
            course_id: Course ID to focus the question on (1=CS, 2=Math, etc.). Optional.
            difficulty_level: Adjust answer complexity - beginner, medium, or advanced
            
        Returns:
            Formatted study answer with sources and follow-up suggestions
        """
        try:
            # First start a session if we have a course_id
            session_data = None
            if course_id:
                async with httpx.AsyncClient() as client:
                    session_response = await client.post(
                        f"{STUDY_BUDDY_API_BASE}/chat/session/start",
                        json={
                            "course_id": course_id,
                            "learning_goals": ["answer student questions"],
                            "difficulty_preference": difficulty_level
                        },
                        timeout=30.0
                    )
                    if session_response.status_code == 200:
                        session_data = session_response.json()
            
            # Ask the question
            async with httpx.AsyncClient() as client:
                payload = {
                    "question": question,
                    "difficulty_preference": difficulty_level
                }
                if course_id:
                    payload["course_id"] = course_id
                if session_data:
                    payload["session_id"] = session_data["session_id"]
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/chat/ask",
                    json=payload,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    return f"❌ Error asking question: {response.status_code} {response.text}"
                
                result = response.json()
                
                # Format the response nicely
                answer_text = f"## 📚 Study Buddy Answer\n\n{result['answer']}\n\n"
                
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
                    
                return answer_text
            
        except httpx.TimeoutException:
            return "⏱️ Request timed out. The Study Buddy API might be processing a complex question. Please try again."
        except Exception as e:
            return f"❌ Error asking study question: {str(e)}"
    
    @mcp.tool()
    async def generate_study_guide(
        course_id: str,
        topics: str = "",
        difficulty_level: str = "medium",
        weeks: str = ""
    ) -> str:
        """Generate comprehensive study guide for course topics.
        
        Creates AI-powered study guides with structured sections, key concepts, 
        definitions, examples, and review questions based on course materials.
        
        Args:
            course_id: Course ID to generate study guide for
            topics: Comma-separated topics to focus on (e.g., "algorithms, data structures"). Leave empty for all topics.
            difficulty_level: Complexity level - beginner, medium, or advanced
            weeks: Comma-separated week numbers to include (e.g., "1,3,5"). Leave empty for all weeks.
            
        Returns:
            Formatted study guide with sections and source materials
        """
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
        difficulty_level: str = "medium"
    ) -> str:
        """Create flashcards for specific course topic.
        
        Generates AI-powered flashcards with questions and answers based on 
        course materials. Perfect for memorization and quick review.
        
        Args:
            topic: Specific topic for flashcards (e.g., "binary search trees")
            course_id: Course ID to generate flashcards for  
            count: Number of flashcards to generate (5-50, default: 10)
            difficulty_level: Complexity level - beginner, medium, or advanced
            
        Returns:
            Formatted flashcards with front/back pairs and source materials
        """
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
        difficulty_level: str = "medium"
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
            
        Returns:
            Formatted quiz with questions, answers, and source materials
        """
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
                
                return quiz_text
            
        except httpx.TimeoutException:
            return "⏱️ Quiz generation timed out. This is a complex process - please try again."
        except Exception as e:
            return f"❌ Error generating quiz: {str(e)}"



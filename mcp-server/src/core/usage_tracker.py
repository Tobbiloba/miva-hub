"""Usage Tracking Service for MIVA Academic MCP Server

This service integrates with the subscription and usage tracking system
to enforce plan limits directly within MCP tools.
"""

import os
import asyncio
from typing import Any, Dict, Optional, Tuple
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class UsageTracker:
    """Usage tracking service that integrates with the subscription system."""
    
    def __init__(self):
        # Use the same POSTGRES_URL as the main application
        self.database_url = os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL')
        if not self.database_url:
            # Fallback to individual components
            self.host = os.getenv('DB_HOST', 'localhost')
            self.port = int(os.getenv('DB_PORT', '5432'))
            self.database = os.getenv('DB_NAME', 'miva_hub')
            self.user = os.getenv('DB_USER', 'postgres')
            self.password = os.getenv('DB_PASSWORD', '')
        
    def get_connection(self):
        """Get database connection"""
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            if self.database_url:
                return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
            else:
                return psycopg2.connect(
                    host=self.host,
                    port=self.port,
                    database=self.database,
                    user=self.user,
                    password=self.password,
                    cursor_factory=RealDictCursor
                )
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return None

    async def get_user_id_from_student_id(self, student_id: str) -> Optional[str]:
        """Get user ID from student ID"""
        conn = self.get_connection()
        if not conn:
            return None
            
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM \"user\" WHERE student_id = %s",
                    (student_id,)
                )
                result = cursor.fetchone()
                return result['id'] if result else None
        except Exception as e:
            logger.error(f"Error getting user ID: {e}")
            return None
        finally:
            conn.close()

    async def check_usage_limit(
        self, 
        student_id: str, 
        usage_type: str, 
        period_type: str = "daily"
    ) -> Dict[str, Any]:
        """
        Check if user has exceeded usage limits for a specific usage type.
        
        Args:
            student_id: Student ID to check
            usage_type: Type of usage (e.g., 'ai_messages_per_day', 'quizzes_per_week')
            period_type: Period type (daily, weekly, monthly)
            
        Returns:
            Dict with 'allowed' boolean and usage information
        """
        user_id = await self.get_user_id_from_student_id(student_id)
        if not user_id:
            return {
                "allowed": False,
                "error": "Student ID not found",
                "current": 0,
                "limit": 0
            }
        
        conn = self.get_connection()
        if not conn:
            return {
                "allowed": False,
                "error": "Database connection failed",
                "current": 0,
                "limit": 0
            }
        
        try:
            with conn.cursor() as cursor:
                # Use the same stored procedure as the frontend
                cursor.execute(
                    "SELECT check_usage_limit(%s, %s, %s) as usage_status",
                    (user_id, usage_type, period_type)
                )
                result = cursor.fetchone()
                
                if result and result['usage_status']:
                    usage_data = result['usage_status']
                    logger.info(f"Usage check for {student_id} ({usage_type}): {usage_data}")
                    return usage_data
                else:
                    # Default to allowing if no usage data exists (for new users)
                    return {
                        "allowed": True,
                        "current": 0,
                        "limit": 10,  # Default limit for FREE plan
                        "message": "Default usage limit applied"
                    }
                    
        except Exception as e:
            logger.error(f"Error checking usage limit: {e}")
            # Be permissive on error to avoid blocking legitimate usage
            return {
                "allowed": True,
                "error": f"Usage check failed: {str(e)}",
                "current": 0,
                "limit": 10
            }
        finally:
            conn.close()

    async def increment_usage(
        self, 
        student_id: str, 
        usage_type: str, 
        period_type: str = "daily",
        increment: int = 1
    ) -> bool:
        """
        Increment usage count for a user.
        
        Args:
            student_id: Student ID
            usage_type: Type of usage
            period_type: Period type (daily, weekly, monthly)
            increment: Amount to increment by
            
        Returns:
            True if successful, False otherwise
        """
        user_id = await self.get_user_id_from_student_id(student_id)
        if not user_id:
            logger.error(f"Cannot increment usage: Student ID {student_id} not found")
            return False
        
        conn = self.get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                # Use the same stored procedure as the frontend
                cursor.execute(
                    "SELECT increment_usage(%s, %s, %s, %s) as success",
                    (user_id, usage_type, period_type, increment)
                )
                result = cursor.fetchone()
                
                success = result['success'] if result else False
                
                # CRITICAL: Commit the transaction to persist the changes
                conn.commit()
                
                logger.info(f"Usage increment for {student_id} ({usage_type}): {success}")
                return success
                
        except Exception as e:
            logger.error(f"Error incrementing usage: {e}")
            conn.rollback()  # Rollback on error
            return False
        finally:
            conn.close()

    async def check_and_enforce_usage(
        self, 
        student_id: str, 
        usage_type: str, 
        period_type: str = "daily"
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check usage limit and return whether the operation is allowed.
        This is the main method to be called before executing tools.
        
        Args:
            student_id: Student ID
            usage_type: Type of usage
            period_type: Period type
            
        Returns:
            Tuple of (allowed: bool, usage_info: dict)
        """
        usage_info = await self.check_usage_limit(student_id, usage_type, period_type)
        allowed = usage_info.get("allowed", False)
        
        if not allowed:
            logger.warning(f"Usage limit exceeded for {student_id}: {usage_type}")
            
        return allowed, usage_info

    async def record_usage_after_success(
        self, 
        student_id: str, 
        usage_type: str, 
        period_type: str = "daily"
    ):
        """
        Record usage after successful tool execution.
        Should be called after the tool completes successfully.
        """
        success = await self.increment_usage(student_id, usage_type, period_type)
        if success:
            logger.info(f"Usage recorded for {student_id}: {usage_type}")
        else:
            logger.error(f"Failed to record usage for {student_id}: {usage_type}")


# Tool Usage Type Mappings
USAGE_TYPE_MAPPINGS = {
    # Study Buddy Tools (AI Messages)
    "ask_study_question": ("ai_messages_per_day", "daily"),
    "explain_concept_deeply": ("ai_messages_per_day", "daily"),
    "compare_concepts": ("ai_messages_per_day", "daily"),
    "get_learning_path": ("ai_messages_per_day", "daily"),
    "search_course_content": ("material_searches_per_day", "daily"),
    
    # Quiz Generation Tools
    "generate_quiz": ("quizzes_per_week", "weekly"),
    "create_flashcards": ("flashcard_sets_per_week", "weekly"),
    "generate_practice_problems": ("practice_problems_per_week", "weekly"),
    
    # Exam Tools
    "generate_exam_simulator": ("exams_per_month", "monthly"),
    "submit_exam_answers": ("exams_per_month", "monthly"),
    
    # Study Guide Tools
    "generate_study_guide": ("study_guides_per_week", "weekly"),
    "summarize_material": ("material_searches_per_day", "daily"),
    
    # Note Conversion Tools
    "convert_notes_to_flashcards": ("flashcard_sets_per_week", "weekly"),
    
    # Basic course access tools - no limits (always allowed)
    "get_course_materials": None,
    "list_enrolled_courses": None,
    "get_upcoming_assignments": None,
    "get_academic_schedule": None,
    "get_course_info": None,
}


def get_usage_type_for_tool(tool_name: str) -> Optional[Tuple[str, str]]:
    """
    Get the usage type and period for a given tool name.
    
    Args:
        tool_name: Name of the MCP tool
        
    Returns:
        Tuple of (usage_type, period_type) or None if unlimited
    """
    return USAGE_TYPE_MAPPINGS.get(tool_name)


def create_usage_error_response(usage_info: Dict[str, Any], tool_name: str) -> str:
    """
    Create a formatted error response when usage limits are exceeded.
    
    Args:
        usage_info: Usage information from the tracker
        tool_name: Name of the tool that was blocked
        
    Returns:
        JSON string with error message and upgrade information
    """
    current = usage_info.get("current", 0)
    limit = usage_info.get("limit", 0)
    plan = usage_info.get("plan", "FREE")
    
    error_response = {
        "error": "Usage limit exceeded",
        "message": f"You have reached your {tool_name} limit for this period.",
        "details": {
            "current_usage": current,
            "limit": limit,
            "plan": plan,
            "tool": tool_name
        },
        "suggestion": "Upgrade your plan to get more usage or wait for the next billing period.",
        "upgrade_url": "/pricing",
        "support_email": "support@miva.edu.ng"
    }
    
    return json.dumps(error_response, indent=2)


# Global usage tracker instance
usage_tracker = UsageTracker()


def usage_limited(usage_type: str, period_type: str = "daily"):
    """
    Decorator to add usage tracking to MCP tools.
    
    Args:
        usage_type: Type of usage to track
        period_type: Period type (daily, weekly, monthly)
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract student_id from arguments
            student_id = kwargs.get('student_id')
            if not student_id and args:
                # Try to find student_id in positional args
                # This depends on the tool signature
                for arg in args:
                    if isinstance(arg, str) and arg.startswith('STU'):
                        student_id = arg
                        break
            
            if not student_id:
                logger.error(f"No student_id found for usage tracking in {func.__name__}")
                return await func(*args, **kwargs)
            
            # Check usage limit before execution
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, usage_type, period_type
            )
            
            if not allowed:
                return create_usage_error_response(usage_info, func.__name__)
            
            # Execute the original function
            try:
                result = await func(*args, **kwargs)
                
                # Record usage after successful execution
                await usage_tracker.record_usage_after_success(
                    student_id, usage_type, period_type
                )
                
                return result
                
            except Exception as e:
                # Don't record usage on error
                logger.error(f"Tool {func.__name__} failed: {e}")
                raise
        
        return wrapper
    return decorator
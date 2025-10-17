"""Schedule Management Tools for MIVA Academic MCP Server"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_schedule_tools(mcp):
    """Register all schedule-related tools with the MCP server"""
    
    @mcp.tool()
    async def get_course_schedule(
        course_code: str,
        student_id: str,
        week_number: int | None = None
    ) -> str:
        """Get class schedule and timetable for a specific course.
        
        Retrieves class times, locations, faculty assignments, and special
        events for enrolled courses, optionally filtered by week.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            student_id: Student ID for enrollment verification
            week_number: Optional week number filter (1-16)
            
        Returns:
            Formatted JSON string with schedule information or error message
        """
        try:
            result = await academic_repo.get_course_schedule(
                course_code=course_code.upper(),
                student_id=student_id
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch course schedule: {str(e)}"})

    @mcp.tool()
    async def get_academic_schedule(
        student_id: str,
        semester: str | None = None,
        week_number: int | None = None
    ) -> str:
        """Get comprehensive academic schedule for all enrolled courses.
        
        Retrieves a complete weekly schedule showing all classes across all
        enrolled courses, organized by day with times, locations, and instructors.
        
        Args:
            student_id: Student ID to get schedule for
            semester: Optional semester filter (e.g., "2024-fall", "2025-spring")
            week_number: Optional week number filter (1-16) [currently not implemented]
            
        Returns:
            Formatted JSON string with comprehensive schedule or error message
        """
        try:
            result = await academic_repo.get_academic_schedule(
                student_id=student_id,
                semester=semester,
                week_number=week_number
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch academic schedule: {str(e)}"})
"""Schedule Management Tools for MIVA Academic MCP Server"""

import json
import sys
import os
from typing import Optional
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_schedule_tools(mcp):
    """Register all schedule-related tools with the MCP server"""
    

    @mcp.tool()
    async def get_academic_schedule(
        student_id: str,
        semester: Optional[str] = None,
        week_number: Optional[int] = None
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
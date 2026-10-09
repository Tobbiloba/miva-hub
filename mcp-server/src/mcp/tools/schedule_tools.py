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
        week_number: Optional[int] = None
    ) -> str:
        """Get the weekly class schedule for the student's current term.

        Shows all classes across the student's enrolled courses, organized by
        day with times, locations and instructors. The term is the student's
        university's current term (not an argument).

        Args:
            student_id: Student ID (injected from the signed-in session)
            week_number: Optional week number filter (1-16) [currently not implemented]

        Returns:
            Formatted JSON string with comprehensive schedule or error message
        """
        try:
            result = await academic_repo.get_academic_schedule(
                student_id=student_id,
                week_number=week_number
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch academic schedule: {str(e)}"})
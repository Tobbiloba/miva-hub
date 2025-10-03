"""Assignment Management Tools for MIVA Academic MCP Server"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_assignment_tools(mcp):
    """Register all assignment-related tools with the MCP server"""
    
    @mcp.tool()
    async def get_upcoming_assignments(
        student_id: str,
        course_code: str | None = None,
        days_ahead: int = 30
    ) -> str:
        """Get upcoming assignments for a student.
        
        Retrieves assignments due within the specified timeframe, optionally
        filtered by course. Shows due dates, submission status, and requirements.
        
        Args:
            student_id: Student ID to get assignments for
            course_code: Optional course filter (e.g., CS101, MATH201)
            days_ahead: Number of days to look ahead (default: 30)
            
        Returns:
            Formatted JSON string with upcoming assignments or error message
        """
        try:
            result = await academic_repo.get_upcoming_assignments(
                student_id=student_id,
                course_code=course_code.upper() if course_code else None,
                days_ahead=days_ahead
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch upcoming assignments: {str(e)}"})


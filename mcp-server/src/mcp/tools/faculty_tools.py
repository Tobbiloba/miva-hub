"""Faculty Information Tools for MIVA Academic MCP Server"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_faculty_tools(mcp):
    """Register all faculty-related tools with the MCP server"""
    
    @mcp.tool()
    async def get_faculty_contact(
        course_code: str,
        student_id: str
    ) -> str:
        """Get contact information for course faculty and teaching assistants.
        
        Retrieves faculty contact details, office hours, preferred communication
        methods, and TA information for enrolled students.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            student_id: Student ID for enrollment verification
            
        Returns:
            Formatted JSON string with faculty contact info or error message
        """
        try:
            result = await academic_repo.get_faculty_info(
                course_code=course_code.upper(),
                student_id=student_id
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch faculty contact: {str(e)}"})
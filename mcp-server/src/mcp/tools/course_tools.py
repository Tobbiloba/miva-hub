"""Course Management Tools for MIVA Academic MCP Server"""

import json
import sys
import os
from typing import Optional
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_course_tools(mcp):
    """Register all course-related tools with the MCP server"""
    
    @mcp.tool()
    async def list_enrolled_courses(student_id: str, semester: Optional[str] = None) -> str:
        """List all courses a student is enrolled in.
        
        Retrieves all courses the student is currently enrolled in with course details,
        credits, and enrollment status.
        
        Args:
            student_id: Student ID to get enrollments for
            semester: Optional semester filter (e.g., "2024-fall", "2025-spring")
            
        Returns:
            Formatted JSON string with enrolled courses or error message
        """
        try:
            result = await academic_repo.get_student_enrollments(
                student_id=student_id,
                semester=semester
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch enrolled courses: {str(e)}"})
    
    @mcp.tool()
    async def get_course_materials(
        course_code: str,
        student_id: str,
        week_number: Optional[int] = None,
        material_type: Optional[str] = None
    ) -> str:
        """Get course materials for enrolled courses.
        
        Fetches course materials for a specific course, optionally filtered by
        week number and material type. Only accessible for enrolled students.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            student_id: Student ID for enrollment verification
            week_number: Optional week number filter (1-16)
            material_type: Optional material type filter (lecture, reading, assignment, quiz, video)
            
        Returns:
            Formatted JSON string with course materials or error message
        """
        try:
            result = await academic_repo.get_course_materials(
                course_code=course_code.upper(),
                student_id=student_id,
                week_number=week_number,
                material_type=material_type
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch course materials: {str(e)}"})


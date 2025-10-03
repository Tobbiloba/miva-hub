"""Course Management Tools for MIVA Academic MCP Server"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_course_tools(mcp):
    """Register all course-related tools with the MCP server"""
    
    @mcp.tool()
    async def get_course_materials(
        course_code: str,
        student_id: str,
        week_number: int | None = None,
        material_type: str | None = None
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

    @mcp.tool()
    async def get_course_info(
        course_code: str,
        include_materials: bool = False
    ) -> str:
        """Get detailed information about a specific course.
        
        Provides comprehensive course information including description, credits,
        prerequisites, faculty, and optionally a summary of available materials.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            include_materials: Whether to include materials count summary
            
        Returns:
            Formatted JSON string with course information or error message
        """
        try:
            result = await academic_repo.get_course_info(
                course_code=course_code.upper(),
                include_materials=include_materials
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch course info: {str(e)}"})

    @mcp.tool()
    async def list_enrolled_courses(student_id: str) -> str:
        """List all courses a student is currently enrolled in.
        
        Returns enrollment information including course details, enrollment date,
        current grade, and academic status for each enrolled course.
        
        Args:
            student_id: Student ID to check enrollments for
            
        Returns:
            Formatted JSON string with enrollment list or error message
        """
        try:
            result = await academic_repo.get_student_enrollments(student_id=student_id)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch enrollments: {str(e)}"})


    @mcp.tool()
    async def view_course_announcements(
        course_code: str,
        student_id: str,
        limit: int = 10
    ) -> str:
        """View recent announcements for a specific course.
        
        Retrieves course announcements, updates, and important notices
        posted by faculty for enrolled students.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            student_id: Student ID for enrollment verification
            limit: Maximum number of announcements to retrieve (default: 10)
            
        Returns:
            Formatted JSON string with announcements or error message
        """
        try:
            result = await academic_repo.get_course_announcements(
                course_code=course_code.upper(),
                student_id=student_id,
                limit=limit
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch announcements: {str(e)}"})

    @mcp.tool()
    async def get_course_syllabus(
        course_code: str,
        student_id: str
    ) -> str:
        """Get the complete syllabus for a specific course.
        
        Retrieves the course syllabus including learning objectives, grading policy,
        schedule, required materials, and course policies for enrolled students.
        
        Args:
            course_code: Course code (e.g., CS101, MATH201)
            student_id: Student ID for enrollment verification
            
        Returns:
            Formatted JSON string with syllabus information or error message
        """
        try:
            result = await academic_repo.get_course_syllabus(
                course_code=course_code.upper(),
                student_id=student_id
            )
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch course syllabus: {str(e)}"})
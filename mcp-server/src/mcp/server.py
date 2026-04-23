from typing import Any
import asyncio
import json
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from mcp.server import Server
import uvicorn

# Import our database module
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import academic_repo

# Initialize FastMCP server for MIVA Academic tools
mcp = FastMCP("miva-academic")


# Course Management Tools
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
async def get_upcoming_assignments(
    student_id: str,
    days_ahead: int = 7,
    course_code: str | None = None,
    include_completed: bool = False
) -> str:
    """Get upcoming assignments and deadlines.
    
    Fetches upcoming assignments across enrolled courses with urgency
    prioritization and deadline information.
    
    Args:
        student_id: Student ID for enrollment verification
        days_ahead: Number of days to look ahead (default: 7)
        course_code: Optional course filter
        include_completed: Whether to include completed assignments
        
    Returns:
        Formatted JSON string with assignments prioritized by urgency
    """
    try:
        result = await academic_repo.get_upcoming_assignments(
            student_id=student_id,
            days_ahead=days_ahead,
            course_code=course_code,
            include_completed=include_completed
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch assignments: {str(e)}"})


@mcp.tool()
async def get_course_info(course_code: str) -> str:
    """Get detailed course information.
    
    Retrieves comprehensive information about a specific course including
    instructor details, meeting times, and course description.
    
    Args:
        course_code: Course code (e.g., CS101, MATH201)
        
    Returns:
        Formatted JSON string with course information
    """
    try:
        result = await academic_repo.get_course_info(course_code.upper())
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch course info: {str(e)}"})


@mcp.tool()
async def list_enrolled_courses(student_id: str, semester: str | None = None) -> str:
    """List courses a student is enrolled in.

    Returns all courses for a student, optionally filtered by semester.
    Includes enrollment status and academic level information.

    Args:
        student_id: Student ID
        semester: Optional semester filter (e.g., "Fall 2024", "Spring 2025")

    Returns:
        Formatted JSON string with enrolled courses
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
async def get_course_schedule(student_id: str, course_code: str | None = None) -> str:
    """Get class schedule information.

    Returns schedule information for enrolled courses including class times,
    locations, and instructor details.

    Args:
        student_id: Student ID for enrollment verification
        course_code: Optional course filter. If provided, returns schedule for
                     that course only. If omitted, returns full academic schedule.

    Returns:
        Formatted JSON string with schedule information
    """
    try:
        if course_code:
            result = await academic_repo.get_course_schedule(
                course_code=course_code.upper(),
                student_id=student_id,
            )
        else:
            result = await academic_repo.get_academic_schedule(
                student_id=student_id,
            )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch schedule: {str(e)}"})


# Student Content Access Tools
@mcp.tool()
async def get_course_videos(
    course_code: str,
    student_id: str,
    week_number: int | None = None,
    video_type: str | None = None
) -> str:
    """Get course video content.

    Access video lectures and instructional content for enrolled courses.
    Includes uploaded videos and external URLs (YouTube, Coursera, etc.).

    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-16)
        video_type: Unused, kept for backward compatibility

    Returns:
        Formatted JSON string with video content information
    """
    try:
        result = await academic_repo.get_course_videos(
            course_code=course_code.upper(),
            student_id=student_id,
            week_number=week_number,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch course videos: {str(e)}"})


@mcp.tool()
async def get_reading_materials(
    course_code: str,
    student_id: str,
    week_number: int | None = None,
    material_type: str | None = None
) -> str:
    """Get reading materials and documents.

    Access PDFs, external readings, and supplementary materials for courses.
    Excludes video content.

    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-16)
        material_type: Unused, kept for backward compatibility

    Returns:
        Formatted JSON string with reading materials
    """
    try:
        result = await academic_repo.get_reading_materials(
            course_code=course_code.upper(),
            student_id=student_id,
            week_number=week_number,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch reading materials: {str(e)}"})


@mcp.tool()
async def view_course_announcements(
    student_id: str,
    course_code: str | None = None,
    limit: int = 10
) -> str:
    """View course announcements.

    Access recent announcements and updates for enrolled courses.
    If course_code is omitted, returns announcements across all enrolled courses
    and global announcements.

    Args:
        student_id: Student ID for enrollment verification
        course_code: Optional course filter (e.g., COS202, CS101)
        limit: Maximum number of announcements to return (default: 10)

    Returns:
        Formatted JSON string with course announcements
    """
    try:
        result = await academic_repo.get_course_announcements(
            course_code=course_code.upper() if course_code else None,
            student_id=student_id,
            limit=limit,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch announcements: {str(e)}"})


@mcp.tool()
async def get_course_syllabus(course_code: str, student_id: str) -> str:
    """Get course syllabus and learning objectives.

    Access comprehensive course information including weekly structure,
    course metadata, and learning objectives. Falls back to syllabus
    documents if no week-by-week structure exists.

    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification

    Returns:
        Formatted JSON string with course syllabus information
    """
    try:
        result = await academic_repo.get_course_syllabus(
            course_code=course_code.upper(),
            student_id=student_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch course syllabus: {str(e)}"})


@mcp.tool()
async def get_faculty_contact(course_code: str, student_id: str) -> str:
    """Get faculty contact information and office hours.

    Access instructor contact details, office location, and office hours
    for all faculty assigned to the course.

    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification

    Returns:
        Formatted JSON string with faculty contact information
    """
    try:
        result = await academic_repo.get_faculty_info(
            course_code=course_code.upper(),
            student_id=student_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch faculty contact: {str(e)}"})


@mcp.tool()
async def view_assignment_info(
    course_code: str,
    student_id: str,
    week_number: int | None = None,
    assignment_type: str | None = None
) -> str:
    """View assignment information (read-only).

    Access assignment details, requirements, due dates, and submission status
    for published assignments in a course. Includes grade if already graded.

    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Unused, kept for backward compatibility
        assignment_type: Unused, kept for backward compatibility

    Returns:
        Formatted JSON string with assignment information
    """
    try:
        result = await academic_repo.get_assignment_info(
            course_code=course_code.upper(),
            student_id=student_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch assignment information: {str(e)}"})


def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    """Create a Starlette application that can serve the provided MCP server with SSE.
    
    Sets up a Starlette web application with routes for SSE (Server-Sent Events)
    communication with the MCP server.
    
    Args:
        mcp_server: The MCP server instance to connect
        debug: Whether to enable debug mode for the Starlette app
        
    Returns:
        A configured Starlette application
    """
    # Create an SSE transport with a base path for messages
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        """Handler for SSE connections.
        
        Establishes an SSE connection and connects it to the MCP server.
        
        Args:
            request: The incoming HTTP request
        """
        # Connect the SSE transport to the request
        async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,  # noqa: SLF001
        ) as (read_stream, write_stream):
            # Run the MCP server with the SSE streams
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    # Create and return the Starlette application with routes
    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),  # Endpoint for SSE connections
            Mount("/messages/", app=sse.handle_post_message),  # Endpoint for posting messages
        ],
    )


if __name__ == "__main__":
    # Get the underlying MCP server from the FastMCP instance
    mcp_server = mcp._mcp_server  # noqa: WPS437
    
    import argparse
    
    # Set up command-line argument parsing
    parser = argparse.ArgumentParser(description='Run MCP server with configurable transport')
    # Allow choosing between stdio and SSE transport modes
    parser.add_argument('--transport', choices=['stdio', 'sse'], default='stdio', 
                        help='Transport mode (stdio or sse)')
    # Host configuration for SSE mode
    parser.add_argument('--host', default='0.0.0.0', 
                        help='Host to bind to (for SSE mode)')
    # Port configuration for SSE mode
    parser.add_argument('--port', type=int, default=8080, 
                        help='Port to listen on (for SSE mode)')
    args = parser.parse_args()

    # Launch the server with the selected transport mode
    if args.transport == 'stdio':
        # Run with stdio transport (default)
        # This mode communicates through standard input/output
        mcp.run(transport='stdio')
    else:
        # Run with SSE transport (web-based)
        # Create a Starlette app to serve the MCP server
        starlette_app = create_starlette_app(mcp_server, debug=True)
        # Start the web server with the configured host and port
        uvicorn.run(starlette_app, host=args.host, port=args.port)
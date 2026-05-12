from typing import Any
import asyncio
import json
import logging
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route
from mcp.server import Server
import uvicorn

# Import our database module
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import academic_repo

logger = logging.getLogger(__name__)

# Initialize FastMCP server for MIVA Academic tools
mcp = FastMCP("miva-academic")

# Shared-secret value (read once at import time)
_MCP_SHARED_SECRET = os.environ.get("MCP_SHARED_SECRET", "")


# Course Management Tools
@mcp.tool()
async def get_course_materials(
    course_code: str,
    student_id: str,
    week_number: int | None = None,
    material_type: str | None = None
) -> str:
    """List all materials available in a course (metadata only, not content).

    Use this to list all materials in a specific course the student is enrolled
    in — returns titles, types, weeks, and file info. Does NOT search inside
    material content. For searching across material CONTENTS (transcripts, PDF
    text), use search_course_content instead.

    Args:
        course_code: Course code (e.g., CS101, MATH201)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-16)
        material_type: Optional material type filter (lecture, reading, assignment, quiz, video)

    Returns:
        Formatted JSON string with course materials list or error message
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
        logger.error("Tool get_course_materials failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve course materials. Please try again."})


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
        logger.error("Tool get_upcoming_assignments failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve assignments. Please try again."})


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
        logger.error("Tool get_course_info failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve course info. Please try again."})


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
        logger.error("Tool list_enrolled_courses failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve enrolled courses. Please try again."})


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
        logger.error("Tool get_course_schedule failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve schedule. Please try again."})


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
        logger.error("Tool get_course_videos failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve course videos. Please try again."})


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
        logger.error("Tool get_reading_materials failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve reading materials. Please try again."})


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
        logger.error("Tool view_course_announcements failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve announcements. Please try again."})


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
        logger.error("Tool get_course_syllabus failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve course syllabus. Please try again."})


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
        logger.error("Tool get_faculty_contact failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve faculty contact info. Please try again."})


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
        logger.error("Tool view_assignment_info failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve assignment information. Please try again."})


@mcp.tool()
async def get_curriculum_guidance(student_id: str) -> str:
    """Returns the curriculum map for the student's current program, level, and semester.

    Lists compulsory and elective courses they should be taking, and identifies
    any gaps in their current enrollments.

    Args:
        student_id: Student ID

    Returns:
        Formatted JSON string with curriculum guidance
    """
    try:
        result = await academic_repo.get_curriculum_guidance(
            student_id=student_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error("Tool get_curriculum_guidance failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve curriculum guidance. Please try again."})


@mcp.tool()
async def get_academic_standing(student_id: str) -> str:
    """Returns the student's cumulative academic performance.

    Includes CGPA, credits earned, degree classification (First Class, 2:1,
    2:2, Third, Pass), and graduation progress.

    Args:
        student_id: Student ID

    Returns:
        Formatted JSON string with academic standing
    """
    try:
        result = await academic_repo.get_academic_standing(
            student_id=student_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error("Tool get_academic_standing failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve academic standing. Please try again."})


# Content Search & Retrieval Tools
@mcp.tool()
async def search_course_content(
    student_id: str,
    course_code: str,
    query: str
) -> str:
    """Search across the full text of all transcripts and PDFs the student has access to.

    Use this when the user asks "search for X", "find content about X",
    "where did we discuss X", "is there anything about X in my materials",
    or similar phrasing. Searches inside the actual lesson content (extracted
    PDF text and video transcripts), not just titles or metadata. Returns
    matching materials with relevant text snippets showing where the match was found.

    Args:
        student_id: Student ID for enrollment verification
        course_code: Course code to search within (e.g., COS202, CS101)
        query: A keyword or phrase to search for in lesson transcripts and PDF text

    Returns:
        Formatted JSON string with matching materials, relevance scores, and text snippets
    """
    try:
        result = await academic_repo.search_course_content(
            student_id=student_id,
            course_code=course_code.upper(),
            query=query,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error("Tool search_course_content failed: %s", e, exc_info=True)
        return json.dumps({"error": "Content search failed. Please try again."})


@mcp.tool()
async def get_lesson_content(
    student_id: str,
    material_id: str
) -> str:
    """Get the full transcript text of a single lesson by material_id.

    Use this when the user asks "explain what's in week 3 lecture",
    "show me the content of [specific lesson]", or when you need the
    complete text of a material to answer a detailed question. Requires
    the material_id (UUID) — use get_course_materials or search_course_content
    first to find the right material_id, then call this tool for the full text.

    Args:
        student_id: Student ID for enrollment verification
        material_id: UUID of the course material (get this from get_course_materials or search_course_content results)

    Returns:
        Formatted JSON string with full transcript text, source type, word count, and metadata
    """
    try:
        result = await academic_repo.get_lesson_content(
            student_id=student_id,
            material_id=material_id,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error("Tool get_lesson_content failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve lesson content. Please try again."})


@mcp.tool()
async def list_quizzes_and_assignments(
    student_id: str,
    course_code: str | None = None
) -> str:
    """List quizzes and assignments for enrolled courses.

    Returns all captured quizzes and assignments the student has access to.
    Use this when a student asks "what quizzes do I have", "show my
    assignments for COS201", or "what assessments are coming up".

    Args:
        student_id: Student ID for enrollment verification
        course_code: Optional course filter (e.g., COS202). If omitted, returns across all enrolled courses.

    Returns:
        Formatted JSON string with quizzes and assignments including metadata (question count, due dates, max grade)
    """
    try:
        result = await academic_repo.list_quizzes_and_assignments(
            student_id=student_id,
            course_code=course_code.upper() if course_code else None,
        )
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error("Tool list_quizzes_and_assignments failed: %s", e, exc_info=True)
        return json.dumps({"error": "Could not retrieve quizzes and assignments. Please try again."})


# ---------------------------------------------------------------------------
# Shared-secret authentication middleware
# ---------------------------------------------------------------------------
class SharedSecretMiddleware(BaseHTTPMiddleware):
    """Validates X-MCP-Secret header on all requests when MCP_SHARED_SECRET is set."""

    async def dispatch(self, request: Request, call_next):
        if _MCP_SHARED_SECRET:
            provided = request.headers.get("X-MCP-Secret", "")
            if provided != _MCP_SHARED_SECRET:
                logger.warning("Rejected MCP request: invalid or missing X-MCP-Secret header")
                return JSONResponse({"error": "Unauthorized"}, status_code=401)
        return await call_next(request)


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

    # Build middleware stack — auth is applied when MCP_SHARED_SECRET is set
    middleware = [Middleware(SharedSecretMiddleware)]

    # Create and return the Starlette application with routes
    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),  # Endpoint for SSE connections
            Mount("/messages/", app=sse.handle_post_message),  # Endpoint for posting messages
        ],
        middleware=middleware,
    )


# Configure logging for the MCP server
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
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
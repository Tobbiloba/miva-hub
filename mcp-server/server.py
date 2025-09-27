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
from database import academic_repo

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
        # TODO: Implement in academic_repo
        result = {
            "student_id": student_id,
            "semester": semester or "Current",
            "courses": [
                {
                    "course_code": "CS101",
                    "course_name": "Introduction to Computer Science",
                    "instructor": "Dr. Sarah Johnson",
                    "credits": 3,
                    "level": "100",
                    "semester": "Fall 2024"
                },
                {
                    "course_code": "MATH201",
                    "course_name": "Calculus II",
                    "instructor": "Dr. Michael Brown",
                    "credits": 4,
                    "level": "200", 
                    "semester": "Fall 2024"
                }
            ],
            "total_credits": 7
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch enrolled courses: {str(e)}"})


@mcp.tool()
async def get_course_schedule(student_id: str, course_code: str | None = None) -> str:
    """Get class schedule information.
    
    Returns schedule information for enrolled courses including class times,
    locations, and instructor office hours.
    
    Args:
        student_id: Student ID for enrollment verification
        course_code: Optional course filter
        
    Returns:
        Formatted JSON string with schedule information
    """
    try:
        # TODO: Implement in academic_repo
        result = {
            "student_id": student_id,
            "course_filter": course_code,
            "schedule": [
                {
                    "course_code": "CS101",
                    "course_name": "Introduction to Computer Science",
                    "meeting_times": [
                        {"day": "Monday", "time": "10:00-11:00", "location": "Room 201"},
                        {"day": "Wednesday", "time": "10:00-11:00", "location": "Room 201"},
                        {"day": "Friday", "time": "10:00-11:00", "location": "Room 201"}
                    ],
                    "instructor": "Dr. Sarah Johnson",
                    "office_hours": "Tuesday/Thursday 2:00-4:00 PM"
                }
            ]
        }
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
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-12)
        video_type: Optional video type filter (lecture, introduction, tutorial)
        
    Returns:
        Formatted JSON string with video content information
    """
    try:
        # Sample data based on content.md structure
        videos = [
            {
                "id": "cos202_w1_intro",
                "course_code": "COS202",
                "week_number": 1,
                "title": "Week 1: Introductory Video - Advanced Object-Oriented Programming",
                "video_type": "introduction",
                "duration": "45 minutes",
                "description": "Introduction to advanced OOP concepts in C++",
                "video_url": "/videos/cos202_week1_intro.mp4",
                "thumbnail": "/thumbnails/cos202_w1.jpg",
                "status": "available"
            },
            {
                "id": "cos202_w2_lecture",
                "course_code": "COS202", 
                "week_number": 2,
                "title": "Week 2: Video Lecture - Organising Class Hierarchies",
                "video_type": "lecture",
                "duration": "60 minutes",
                "description": "Deep dive into class hierarchies and program organisation",
                "video_url": "/videos/cos202_week2_lecture.mp4",
                "thumbnail": "/thumbnails/cos202_w2.jpg",
                "status": "available"
            },
            {
                "id": "cos202_w7_eventdriven_a",
                "course_code": "COS202",
                "week_number": 7,
                "title": "Week 7: Introductory Video - Event-Driven Programming (A)",
                "video_type": "introduction",
                "duration": "35 minutes",
                "description": "Part A: Fundamentals of event-driven programming",
                "video_url": "/videos/cos202_week7_eventdriven_a.mp4",
                "thumbnail": "/thumbnails/cos202_w7a.jpg",
                "status": "available"
            },
            {
                "id": "cos202_w7_eventdriven_b",
                "course_code": "COS202",
                "week_number": 7,
                "title": "Week 7: Introductory Video - Event-Driven Programming (B)",
                "video_type": "introduction", 
                "duration": "40 minutes",
                "description": "Part B: Advanced event-driven programming concepts",
                "video_url": "/videos/cos202_week7_eventdriven_b.mp4",
                "thumbnail": "/thumbnails/cos202_w7b.jpg",
                "status": "available"
            },
            {
                "id": "cos202_w9_gui",
                "course_code": "COS202",
                "week_number": 9,
                "title": "Week 9: Video Lecture - Introduction to GUI Programming in C++",
                "video_type": "lecture",
                "duration": "75 minutes",
                "description": "Comprehensive introduction to GUI development in C++",
                "video_url": "/videos/cos202_week9_gui.mp4",
                "thumbnail": "/thumbnails/cos202_w9.jpg",
                "status": "available"
            }
        ]
        
        # Apply filters
        if week_number:
            videos = [v for v in videos if v["week_number"] == week_number]
        if video_type:
            videos = [v for v in videos if v["video_type"] == video_type]
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "videos": videos,
            "total_count": len(videos),
            "access_level": "enrolled_student"
        }
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
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-12)
        material_type: Optional material type filter (pdf, url, worksheet)
        
    Returns:
        Formatted JSON string with reading materials
    """
    try:
        # Sample data based on content.md structure
        materials = [
            {
                "id": "cos202_w1_reading",
                "course_code": "COS202",
                "week_number": 1,
                "title": "Week 1: Reading - Advanced Object-Oriented Programming",
                "material_type": "url",
                "description": "Comprehensive reading on advanced OOP concepts",
                "url": "https://external-resource.com/oop-advanced",
                "file_size": None,
                "pages": None
            },
            {
                "id": "cos202_w2_pdf",
                "course_code": "COS202",
                "week_number": 2,
                "title": "Organising Class Hierarchies(PDF)",
                "material_type": "pdf",
                "description": "PDF guide to organizing class hierarchies",
                "url": "/materials/cos202_class_hierarchies.pdf",
                "file_size": "2.5 MB",
                "pages": 24
            },
            {
                "id": "cos202_w4_worksheet",
                "course_code": "COS202",
                "week_number": 4,
                "title": "Worksheet - Search Algorithm",
                "material_type": "worksheet",
                "description": "Practice problems for search algorithms",
                "url": "/materials/cos202_search_worksheet.pdf",
                "file_size": "1.2 MB",
                "pages": 8
            },
            {
                "id": "cos202_w4_reading",
                "course_code": "COS202",
                "week_number": 4,
                "title": "Week 4: Reading - Understanding Search Algorithms",
                "material_type": "url",
                "description": "External resource on search algorithm techniques",
                "url": "https://algorithm-guide.com/search-algorithms",
                "file_size": None,
                "pages": None
            },
            {
                "id": "cos202_w5_reading",
                "course_code": "COS202",
                "week_number": 5,
                "title": "Week 5: Reading - Understanding Common Sorting Techniques in C++.pdf",
                "material_type": "pdf",
                "description": "Comprehensive guide to sorting algorithms in C++",
                "url": "/materials/cos202_sorting_techniques.pdf",
                "file_size": "3.1 MB",
                "pages": 32
            },
            {
                "id": "cos202_w6_pdf",
                "course_code": "COS202",
                "week_number": 6,
                "title": "Week 6: Recursive Algorithms and Their Applications (PDF)",
                "material_type": "pdf",
                "description": "Detailed exploration of recursive programming techniques",
                "url": "/materials/cos202_recursive_algorithms.pdf",
                "file_size": "2.8 MB",
                "pages": 28
            }
        ]
        
        # Apply filters
        if week_number:
            materials = [m for m in materials if m["week_number"] == week_number]
        if material_type:
            materials = [m for m in materials if m["material_type"] == material_type]
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "materials": materials,
            "total_count": len(materials),
            "access_level": "enrolled_student"
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch reading materials: {str(e)}"})


@mcp.tool()
async def view_course_announcements(
    course_code: str,
    student_id: str,
    limit: int = 10
) -> str:
    """View course announcements.
    
    Access recent announcements and updates for enrolled courses.
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        limit: Maximum number of announcements to return (default: 10)
        
    Returns:
        Formatted JSON string with course announcements
    """
    try:
        # Sample announcements based on content.md structure
        announcements = [
            {
                "id": "cos202_ann_001",
                "course_code": "COS202",
                "title": "Welcome to COS 202 - Computer Programming II",
                "content": "Welcome to the Fall 2024 semester! Please review the course syllabus and complete the pre-semester test.",
                "posted_date": "2024-08-15T09:00:00Z",
                "posted_by": "Dr. Augustus Isichei",
                "priority": "high",
                "category": "general"
            },
            {
                "id": "cos202_ann_002", 
                "course_code": "COS202",
                "title": "Mid-Semester Assessment Schedule",
                "content": "The Mid-Semester Assessment will be available from August 24-27, 2025. You have two attempts.",
                "posted_date": "2024-08-20T14:30:00Z",
                "posted_by": "Dr. Emeka Ogbuju",
                "priority": "high",
                "category": "assessment"
            },
            {
                "id": "cos202_ann_003",
                "course_code": "COS202", 
                "title": "Office Hours Available",
                "content": "Faculty office hours are now available for booking. Click the office hours link in course materials.",
                "posted_date": "2024-08-18T11:00:00Z",
                "posted_by": "Dr. Esther Omonayin",
                "priority": "medium",
                "category": "support"
            }
        ]
        
        # Apply limit
        announcements = announcements[:limit]
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "announcements": announcements,
            "total_count": len(announcements),
            "access_level": "enrolled_student"
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch announcements: {str(e)}"})


@mcp.tool()
async def get_course_syllabus(course_code: str, student_id: str) -> str:
    """Get course syllabus and learning objectives.
    
    Access comprehensive course information including objectives, content outline, and assessment structure.
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        
    Returns:
        Formatted JSON string with course syllabus information
    """
    try:
        # Sample syllabus based on content.md structure
        syllabus = {
            "course_code": "COS202",
            "course_name": "Computer Programming II",
            "school": "School of Computing",
            "faculty": [
                "AI Augustus Isichei",
                "EO Emeka Ogbuju", 
                "EO Esther Omonayin",
                "JW Jimin Wuese"
            ],
            "description": "Explore advanced object-oriented programming concepts, including polymorphism, abstract classes, and interfaces. Learn effective program organisation with packages and namespaces and utilise APIs for iterators, lists, stacks, and queues. Delve into searching, sorting, and recursive algorithms. Master event-driven programming, covering event-handling methods, propagation, and exception handling. Apply these skills to graphic user interface (GUI) programming for real-world applications.",
            "learning_objectives": [
                "Develop solutions for a range of problems using object-oriented programming in C++",
                "Use modules, packages, and namespaces for programme organisation",
                "Use API when writing applications",
                "Apply the divide and conquer strategy to searching for and sorting problems using iterative and/or recursive solutions",
                "Explain the concept of exceptions in programming and how to handle exceptions in programmes",
                "Write simple multi-threaded applications",
                "Design and implement simple GUI applications"
            ],
            "course_content": [
                "Advanced object-oriented programming: polymorphism, abstract classes, and interfaces",
                "Class hierarchies and programme organisation using packages and namespaces",
                "Use of API: iterators and enumerators, List, stacks, and queues from API",
                "Searching and sorting algorithms",
                "Recursive algorithms",
                "Event-driven programming: event-handling methods, event propagation, exception handling",
                "Applications in Graphical User Interface (GUI) programming"
            ],
            "assessment_structure": {
                "pre_semester_test": {"weight": "0%", "type": "Ungraded baseline"},
                "practice_assessments": {"weight": "0%", "type": "Weekly ungraded practice"},
                "mid_semester_assessment": {"weight": "30%", "type": "Graded CA"},
                "end_semester_assessment": {"weight": "30%", "type": "Graded CA"},
                "final_examination": {"weight": "40%", "type": "Graded exam"}
            },
            "weekly_structure": [
                {"week": 1, "topic": "Advanced Object-Oriented Programming"},
                {"week": 2, "topic": "Class Hierarchies and Program Organisation"},
                {"week": 3, "topic": "Utilising API"},
                {"week": 4, "topic": "Search Algorithms"},
                {"week": 5, "topic": "Sorting Algorithms"},
                {"week": 6, "topic": "Recursive Algorithms"},
                {"week": 7, "topic": "Event-Driven Programming"},
                {"week": 8, "topic": "Exception Handling"},
                {"week": 9, "topic": "Graphical User Interface (GUI) Programming"},
                {"week": 10, "topic": "GUI Components and Layout Management"},
                {"week": 11, "topic": "Advanced GUI Techniques"},
                {"week": 12, "topic": "GUI Applications and Project Development"}
            ]
        }
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "syllabus": syllabus,
            "access_level": "enrolled_student"
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch course syllabus: {str(e)}"})


@mcp.tool()
async def get_faculty_contact(course_code: str, student_id: str) -> str:
    """Get faculty contact information and office hours.
    
    Access instructor contact details and office hour booking information.
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        
    Returns:
        Formatted JSON string with faculty contact information
    """
    try:
        # Sample faculty data based on content.md structure
        faculty = [
            {
                "name": "AI Augustus Isichei",
                "title": "Dr.",
                "role": "Course Coordinator",
                "email": "a.isichei@miva.edu.ng",
                "office": "Computing Building, Room 301",
                "office_hours": "Monday/Wednesday 2:00-4:00 PM",
                "booking_url": "/office-hours/book/isichei",
                "specialization": "Object-Oriented Programming, Software Engineering"
            },
            {
                "name": "EO Emeka Ogbuju",
                "title": "Dr.",
                "role": "Lecturer",
                "email": "e.ogbuju@miva.edu.ng", 
                "office": "Computing Building, Room 305",
                "office_hours": "Tuesday/Thursday 1:00-3:00 PM",
                "booking_url": "/office-hours/book/ogbuju",
                "specialization": "Algorithms, Data Structures"
            },
            {
                "name": "EO Esther Omonayin",
                "title": "Dr.",
                "role": "Lecturer",
                "email": "e.omonayin@miva.edu.ng",
                "office": "Computing Building, Room 308",
                "office_hours": "Monday/Friday 10:00-12:00 PM",
                "booking_url": "/office-hours/book/omonayin",
                "specialization": "GUI Programming, Human-Computer Interaction"
            },
            {
                "name": "JW Jimin Wuese",
                "title": "Dr.",
                "role": "Lecturer",
                "email": "j.wuese@miva.edu.ng",
                "office": "Computing Building, Room 312",
                "office_hours": "Wednesday/Friday 9:00-11:00 AM",
                "booking_url": "/office-hours/book/wuese",
                "specialization": "Event-Driven Programming, Software Development"
            }
        ]
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "faculty": faculty,
            "general_contact": {
                "department": "School of Computing",
                "department_email": "computing@miva.edu.ng",
                "support_url": "/office-hours/report-issue"
            },
            "access_level": "enrolled_student"
        }
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
    
    Access assignment details, requirements, and due dates without submission capability.
    
    Args:
        course_code: Course code (e.g., COS202, CS101)
        student_id: Student ID for enrollment verification
        week_number: Optional week number filter (1-12)
        assignment_type: Optional assignment type filter (practice, graded, peer)
        
    Returns:
        Formatted JSON string with assignment information
    """
    try:
        # Sample assignments based on content.md structure
        assignments = [
            {
                "id": "cos202_w1_practice",
                "course_code": "COS202",
                "week_number": 1,
                "title": "Week 1: Practice Assessment (Ungraded)",
                "assignment_type": "practice",
                "description": "Practice quiz to review advanced OOP concepts. Two attempts allowed.",
                "due_date": "2025-05-05T23:59:00Z",
                "attempts_allowed": 2,
                "time_limit": "60 minutes",
                "status": "available",
                "weight": "0%"
            },
            {
                "id": "cos202_w2_peer",
                "course_code": "COS202",
                "week_number": 2,
                "title": "Peer-to-Peer Assessment (Ungraded)",
                "assignment_type": "peer",
                "description": "Discuss polymorphism in C++ with focus on compile-time and runtime polymorphism. Evaluate 2-3 peer submissions.",
                "submission_deadline": "2025-10-24T23:59:00Z",
                "assessment_deadline": "2025-11-07T23:59:00Z",
                "peers_to_evaluate": 3,
                "status": "available",
                "weight": "0%"
            },
            {
                "id": "cos202_mid_semester",
                "course_code": "COS202",
                "week_number": None,
                "title": "Mid-Semester Assessment (Graded)",
                "assignment_type": "graded",
                "description": "Graded assessment covering Weeks 1-4. Two attempts allowed.",
                "due_date": "2025-08-27T23:59:00Z",
                "attempts_allowed": 2,
                "time_limit": "120 minutes",
                "status": "available",
                "weight": "30%"
            },
            {
                "id": "cos202_end_semester",
                "course_code": "COS202",
                "week_number": None,
                "title": "End of Semester Assessment (Graded)",
                "assignment_type": "graded",
                "description": "Comprehensive assessment covering all course material. Two attempts allowed.",
                "due_date": "2025-08-27T23:59:00Z",
                "attempts_allowed": 2,
                "time_limit": "180 minutes",
                "status": "available",
                "weight": "30%"
            }
        ]
        
        # Apply filters
        if week_number:
            assignments = [a for a in assignments if a["week_number"] == week_number]
        if assignment_type:
            assignments = [a for a in assignments if a["assignment_type"] == assignment_type]
        
        result = {
            "course_code": course_code,
            "student_id": student_id,
            "assignments": assignments,
            "total_count": len(assignments),
            "access_level": "enrolled_student",
            "note": "Read-only access - submission not available through this tool"
        }
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
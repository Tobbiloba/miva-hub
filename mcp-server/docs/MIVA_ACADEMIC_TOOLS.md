# MIVA University Academic MCP Server Tools

## Overview

This document outlines the comprehensive set of academic tools available through the MIVA University Model Context Protocol (MCP) Server. These tools provide direct access to academic data and operations, focusing on real-time database interactions and core academic functionality.

**Focus**: Database-driven academic operations, LMS-like functionality, Nigerian university system support
**Exclusions**: AI-powered features (summarization, writing assistance), calendar management, general productivity tools

---

## 🎓 Tool Categories

### 1. Course Management Tools
### 2. Assignment & Assessment Tools  
### 3. Academic Records Tools
### 4. Faculty & Administrative Tools
### 5. MIVA-Specific Features

---

## 📚 1. Course Management Tools

### 1.1 `get_course_materials`
**Description**: Retrieve course materials by week, type, or topic
**Use Case**: Students accessing lecture notes, readings, videos for specific weeks

```python
@mcp.tool()
async def get_course_materials(
    course_code: str,        # e.g., "CS101", "MATH201"
    student_id: str,         # MIVA student ID
    week_number: Optional[int] = None,     # Week 1-15
    material_type: Optional[str] = "all",  # "lecture", "reading", "video", "exercise"
    semester: Optional[str] = "current"    # "current", "first", "second"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "course": {"code": "CS101", "title": "Intro to Computer Science", "credits": 3},
        "materials": [
            {
                "id": "mat_001",
                "title": "Introduction to Programming",
                "type": "lecture",
                "week": 1,
                "file_url": "/files/cs101_week1_lecture.pdf",
                "description": "Basic programming concepts",
                "uploaded_date": "2025-01-15",
                "file_size": "2.5MB"
            }
        ],
        "total_materials": 6,
        "enrollment_verified": true
    }
    """
```

### 1.2 `get_course_info`
**Description**: Retrieve detailed course information including prerequisites and description
**Use Case**: Course selection, academic planning

```python
@mcp.tool()
async def get_course_info(
    course_code: str,        # Course identifier
    include_schedule: bool = True,
    include_prerequisites: bool = True
) -> Dict[str, Any]:
    """
    Returns:
    {
        "course_code": "CS101",
        "title": "Introduction to Computer Science",
        "description": "Fundamentals of programming and computer systems",
        "credits": 3,
        "department": "Computer Science",
        "level": "100",  # Nigerian system: 100, 200, 300, 400
        "prerequisites": ["MATH101"],
        "schedule": [
            {"day": "monday", "time": "09:00-11:00", "location": "CS Lab 1"},
            {"day": "wednesday", "time": "14:00-16:00", "location": "Lecture Hall A"}
        ],
        "instructor": {
            "name": "Dr. Sarah Johnson",
            "email": "s.johnson@miva.edu.ng",
            "office": "CS Building, Room 204"
        },
        "enrollment_capacity": 50,
        "currently_enrolled": 42
    }
    """
```

### 1.3 `list_enrolled_courses`
**Description**: Get all courses a student is currently enrolled in
**Use Case**: Academic dashboard, course overview

```python
@mcp.tool()
async def list_enrolled_courses(
    student_id: str,
    semester: str = "current",  # "current", "first", "second", "2024-2025"
    academic_year: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student": {
            "id": "MIVA/2024/CS/001",
            "name": "John Doe",
            "level": "200",
            "major": "Computer Science"
        },
        "semester": "First Semester 2024-2025",
        "courses": [
            {
                "course_code": "CS201",
                "title": "Data Structures",
                "credits": 3,
                "instructor": "Dr. Sarah Johnson",
                "schedule": "Mon/Wed 10:00-12:00",
                "enrollment_date": "2024-09-15"
            }
        ],
        "total_credits": 18,
        "max_credits_allowed": 21
    }
    """
```

### 1.4 `get_course_schedule`
**Description**: Retrieve detailed schedule for specific courses
**Use Case**: Timetable planning, class attendance

```python
@mcp.tool()
async def get_course_schedule(
    course_codes: List[str],  # Multiple courses
    student_id: str,
    week_range: Optional[str] = "current"  # "current", "1-4", "all"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "schedule": [
            {
                "course_code": "CS201",
                "title": "Data Structures",
                "sessions": [
                    {
                        "day": "monday",
                        "start_time": "10:00",
                        "end_time": "12:00",
                        "location": "CS Lab 2",
                        "type": "lecture",
                        "instructor": "Dr. Sarah Johnson"
                    }
                ]
            }
        ],
        "conflicts": [],  # Schedule conflicts
        "total_weekly_hours": 15
    }
    """
```

---

## 📝 2. Assignment & Assessment Tools

### 2.1 `get_assignments`
**Description**: Retrieve assignments with filtering and status
**Use Case**: Assignment tracking, deadline management

```python
@mcp.tool()
async def get_assignments(
    student_id: str,
    course_code: Optional[str] = None,  # Filter by specific course
    status: str = "all",  # "pending", "submitted", "graded", "overdue"
    days_ahead: int = 30,  # Look ahead period
    include_past: bool = False
) -> Dict[str, Any]:
    """
    Returns:
    {
        "assignments": [
            {
                "id": "assign_001",
                "title": "Programming Assignment 1",
                "course_code": "CS101",
                "course_title": "Intro to Computer Science",
                "description": "Implement basic sorting algorithms",
                "due_date": "2025-02-15T23:59:00Z",
                "assigned_date": "2025-01-20T00:00:00Z",
                "max_points": 100,
                "submission_status": "pending",
                "submission_date": null,
                "grade": null,
                "feedback": null,
                "urgency": "soon",  # "overdue", "urgent", "soon", "later"
                "days_until_due": 3
            }
        ],
        "summary": {
            "total": 5,
            "pending": 3,
            "overdue": 1,
            "submitted_awaiting_grade": 1
        }
    }
    """
```

### 2.2 `submit_assignment`
**Description**: Handle assignment submission metadata (file handling via separate system)
**Use Case**: Assignment submission tracking

```python
@mcp.tool()
async def submit_assignment(
    assignment_id: str,
    student_id: str,
    submission_text: Optional[str] = None,
    file_references: Optional[List[str]] = None,  # File IDs from upload system
    submission_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns:
    {
        "submission_id": "sub_001",
        "assignment_id": "assign_001",
        "student_id": "MIVA/2024/CS/001",
        "submitted_at": "2025-02-12T14:30:00Z",
        "status": "submitted",
        "late_submission": false,
        "confirmation_code": "SUB-2025-001-CS101"
    }
    """
```

### 2.3 `get_grades`
**Description**: Retrieve grades for assignments and courses
**Use Case**: Academic performance tracking

```python
@mcp.tool()
async def get_grades(
    student_id: str,
    course_code: Optional[str] = None,
    semester: str = "current",
    include_details: bool = True
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student": {
            "id": "MIVA/2024/CS/001",
            "name": "John Doe",
            "level": "200"
        },
        "grades": [
            {
                "course_code": "CS201",
                "course_title": "Data Structures",
                "assignments": [
                    {
                        "title": "Assignment 1",
                        "score": 85,
                        "max_score": 100,
                        "percentage": 85.0,
                        "grade": "A",
                        "graded_date": "2025-02-20",
                        "feedback": "Excellent work on algorithm implementation"
                    }
                ],
                "course_average": 87.5,
                "course_grade": "A",
                "credits": 3
            }
        ],
        "semester_gpa": 3.65,
        "cumulative_gpa": 3.72
    }
    """
```

### 2.4 `create_assignment` (Faculty Tool)
**Description**: Faculty tool to create new assignments
**Use Case**: Course management, assignment scheduling

```python
@mcp.tool()
async def create_assignment(
    course_code: str,
    faculty_id: str,
    title: str,
    description: str,
    due_date: str,  # ISO format
    max_points: int,
    assignment_type: str = "homework",  # "quiz", "project", "exam"
    instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns:
    {
        "assignment_id": "assign_002",
        "course_code": "CS101",
        "title": "Programming Assignment 2",
        "created_by": "Dr. Sarah Johnson",
        "created_at": "2025-01-25T10:00:00Z",
        "due_date": "2025-02-25T23:59:00Z",
        "students_notified": 42,
        "status": "active"
    }
    """
```

### 2.5 `manage_quizzes`
**Description**: Create, schedule, and manage quizzes
**Use Case**: Assessment management, quick evaluations

```python
@mcp.tool()
async def manage_quizzes(
    action: str,  # "create", "list", "grade", "results"
    course_code: str,
    faculty_id: Optional[str] = None,
    quiz_data: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    For action="create":
    quiz_data = {
        "title": "Week 3 Quiz",
        "questions": [
            {
                "question": "What is a variable?",
                "type": "multiple_choice",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A"
            }
        ],
        "duration_minutes": 30,
        "start_time": "2025-02-01T14:00:00Z"
    }
    
    Returns:
    {
        "quiz_id": "quiz_001",
        "title": "Week 3 Quiz",
        "course_code": "CS101",
        "scheduled_start": "2025-02-01T14:00:00Z",
        "duration": 30,
        "total_questions": 10,
        "students_enrolled": 42,
        "status": "scheduled"
    }
    """
```

---

## 🎯 3. Academic Records Tools

### 3.1 `get_transcript`
**Description**: Generate official academic transcript data
**Use Case**: Academic records, graduation requirements

```python
@mcp.tool()
async def get_transcript(
    student_id: str,
    include_all_semesters: bool = True,
    format_type: str = "detailed"  # "summary", "detailed", "official"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student": {
            "id": "MIVA/2024/CS/001",
            "name": "John Doe",
            "major": "Computer Science",
            "minor": null,
            "admission_date": "2024-09-01",
            "expected_graduation": "2027-07-01",
            "current_level": "200"
        },
        "academic_record": [
            {
                "semester": "First Semester 2024-2025",
                "courses": [
                    {
                        "course_code": "CS101",
                        "title": "Introduction to Computer Science",
                        "credits": 3,
                        "grade": "A",
                        "points": 4.0
                    }
                ],
                "semester_credits": 18,
                "semester_gpa": 3.67,
                "cumulative_credits": 36,
                "cumulative_gpa": 3.72
            }
        ],
        "summary": {
            "total_credits": 36,
            "cumulative_gpa": 3.72,
            "academic_standing": "Good Standing",
            "completed_levels": ["100"],
            "current_level": "200"
        }
    }
    """
```

### 3.2 `track_attendance`
**Description**: Mark and view attendance records
**Use Case**: Attendance management, academic monitoring

```python
@mcp.tool()
async def track_attendance(
    action: str,  # "mark", "view", "summary"
    course_code: str,
    student_id: Optional[str] = None,  # For individual student
    session_date: Optional[str] = None,
    attendance_data: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    For action="mark" (Faculty use):
    attendance_data = {
        "session_date": "2025-01-20",
        "session_type": "lecture",
        "students": [
            {"student_id": "MIVA/2024/CS/001", "status": "present"},
            {"student_id": "MIVA/2024/CS/002", "status": "absent"}
        ]
    }
    
    For action="view" (Student use):
    Returns:
    {
        "student_id": "MIVA/2024/CS/001",
        "course_code": "CS101",
        "attendance_record": [
            {
                "date": "2025-01-20",
                "session_type": "lecture",
                "status": "present",
                "marked_by": "Dr. Sarah Johnson"
            }
        ],
        "summary": {
            "total_sessions": 20,
            "attended": 18,
            "attendance_percentage": 90.0,
            "required_percentage": 75.0,
            "status": "satisfactory"
        }
    }
    """
```

### 3.3 `get_gpa_calculation`
**Description**: Calculate current and cumulative GPA
**Use Case**: Academic performance monitoring

```python
@mcp.tool()
async def get_gpa_calculation(
    student_id: str,
    calculation_type: str = "both",  # "semester", "cumulative", "both"
    semester: Optional[str] = "current"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student_id": "MIVA/2024/CS/001",
        "current_semester": {
            "semester": "First Semester 2024-2025",
            "courses": [
                {
                    "course_code": "CS201",
                    "credits": 3,
                    "grade": "A",
                    "grade_points": 4.0,
                    "quality_points": 12.0
                }
            ],
            "total_credits": 18,
            "total_quality_points": 66.0,
            "semester_gpa": 3.67
        },
        "cumulative": {
            "total_credits": 54,
            "total_quality_points": 198.0,
            "cumulative_gpa": 3.67,
            "semesters_completed": 3
        },
        "grading_scale": {
            "A": "4.0", "B": "3.0", "C": "2.0", "D": "1.0", "F": "0.0"
        }
    }
    """
```

### 3.4 `academic_standing`
**Description**: Check academic status and warnings
**Use Case**: Academic monitoring, intervention alerts

```python
@mcp.tool()
async def academic_standing(
    student_id: str,
    include_history: bool = False
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student_id": "MIVA/2024/CS/001",
        "current_standing": "Good Standing",  # "Good Standing", "Academic Warning", "Academic Probation"
        "cumulative_gpa": 3.67,
        "required_gpa": 2.0,
        "total_credits": 54,
        "minimum_credits_per_semester": 12,
        "warnings": [],
        "academic_actions": [],
        "eligibility": {
            "graduation": true,
            "financial_aid": true,
            "extracurricular": true,
            "course_registration": true
        },
        "advisor_notes": []
    }
    """
```

---

## 👨‍🏫 4. Faculty & Administrative Tools

### 4.1 `find_faculty`
**Description**: Search faculty directory
**Use Case**: Contact information, office hours, course instructors

```python
@mcp.tool()
async def find_faculty(
    search_query: Optional[str] = None,  # Name search
    department: Optional[str] = None,
    course_code: Optional[str] = None,
    specialization: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns:
    {
        "faculty": [
            {
                "id": "FAC001",
                "name": "Dr. Sarah Johnson",
                "title": "Associate Professor",
                "department": "Computer Science",
                "email": "s.johnson@miva.edu.ng",
                "phone": "+234-xxx-xxx-xxxx",
                "office_location": "CS Building, Room 204",
                "specialization": ["Data Structures", "Algorithms"],
                "courses_taught": ["CS101", "CS201", "CS301"],
                "office_hours": [
                    {"day": "Monday", "time": "14:00-16:00"},
                    {"day": "Wednesday", "time": "10:00-12:00"}
                ],
                "research_interests": ["Machine Learning", "Data Mining"],
                "education": [
                    {"degree": "Ph.D.", "field": "Computer Science", "university": "University of Lagos", "year": 2018}
                ]
            }
        ],
        "total_found": 1
    }
    """
```

### 4.2 `get_office_hours`
**Description**: Get faculty availability and office hours
**Use Case**: Student-faculty meetings, academic advising

```python
@mcp.tool()
async def get_office_hours(
    faculty_id: Optional[str] = None,
    faculty_name: Optional[str] = None,
    department: Optional[str] = None,
    current_week: bool = True
) -> Dict[str, Any]:
    """
    Returns:
    {
        "faculty": {
            "name": "Dr. Sarah Johnson",
            "email": "s.johnson@miva.edu.ng",
            "office": "CS Building, Room 204"
        },
        "office_hours": [
            {
                "day": "Monday",
                "start_time": "14:00",
                "end_time": "16:00",
                "location": "CS Building, Room 204",
                "type": "walk-in",
                "notes": "Data Structures students preferred"
            }
        ],
        "booking_required": false,
        "contact_method": "email",
        "alternative_contact": "Available via Microsoft Teams"
    }
    """
```

### 4.3 `faculty_course_load`
**Description**: View courses taught by faculty member
**Use Case**: Course assignment, workload management

```python
@mcp.tool()
async def faculty_course_load(
    faculty_id: str,
    semester: str = "current"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "faculty": {
            "name": "Dr. Sarah Johnson",
            "department": "Computer Science",
            "position": "Associate Professor"
        },
        "courses": [
            {
                "course_code": "CS101",
                "title": "Introduction to Computer Science",
                "credits": 3,
                "enrolled_students": 42,
                "schedule": [
                    {"day": "Monday", "time": "09:00-11:00", "location": "CS Lab 1"}
                ],
                "role": "Primary Instructor"
            }
        ],
        "total_courses": 3,
        "total_students": 120,
        "teaching_load": "12 credit hours"
    }
    """
```

### 4.4 `student_enrollment`
**Description**: Manage course enrollments (add/drop)
**Use Case**: Registration management, course changes

```python
@mcp.tool()
async def student_enrollment(
    action: str,  # "enroll", "drop", "check_eligibility"
    student_id: str,
    course_code: str,
    semester: Optional[str] = "current"
) -> Dict[str, Any]:
    """
    For action="enroll":
    Returns:
    {
        "enrollment_id": "ENR_001",
        "student_id": "MIVA/2024/CS/001",
        "course_code": "CS201",
        "enrollment_date": "2025-01-15T10:30:00Z",
        "status": "enrolled",
        "prerequisites_met": true,
        "credit_hours_after": 18,
        "tuition_impact": "+₦150,000"
    }
    
    For action="check_eligibility":
    Returns:
    {
        "eligible": true,
        "prerequisites_met": true,
        "missing_prerequisites": [],
        "schedule_conflicts": [],
        "credit_limit_exceeded": false,
        "course_capacity": {"current": 42, "max": 50},
        "registration_period_active": true
    }
    """
```

### 4.5 `generate_academic_report`
**Description**: Generate comprehensive academic performance reports
**Use Case**: Academic advising, performance monitoring

```python
@mcp.tool()
async def generate_academic_report(
    student_id: str,
    report_type: str = "comprehensive",  # "semester", "comprehensive", "progress"
    semester: Optional[str] = "current"
) -> Dict[str, Any]:
    """
    Returns:
    {
        "student": {
            "id": "MIVA/2024/CS/001",
            "name": "John Doe",
            "level": "200",
            "major": "Computer Science"
        },
        "academic_performance": {
            "current_gpa": 3.67,
            "cumulative_gpa": 3.72,
            "credits_completed": 54,
            "credits_required_for_graduation": 120,
            "completion_percentage": 45.0
        },
        "course_performance": [
            {
                "course_code": "CS201",
                "current_grade": "A",
                "attendance": "90%",
                "assignments_submitted": "8/8",
                "participation": "Excellent"
            }
        ],
        "attendance_summary": {
            "overall_percentage": 87.5,
            "courses_below_threshold": []
        },
        "recommendations": [
            "Continue excellent performance in CS201",
            "Consider advanced mathematics courses for next semester"
        ],
        "warnings": [],
        "next_semester_eligibility": true
    }
    """
```

### 4.6 `academic_calendar`
**Description**: Access academic calendar and important dates
**Use Case**: Semester planning, deadline tracking

```python
@mcp.tool()
async def academic_calendar(
    event_type: Optional[str] = None,  # "registration", "exams", "holidays", "deadlines"
    semester: str = "current",
    days_ahead: int = 30
) -> Dict[str, Any]:
    """
    Returns:
    {
        "semester": "First Semester 2024-2025",
        "events": [
            {
                "date": "2025-02-01",
                "type": "registration",
                "title": "Course Registration Opens",
                "description": "Registration for Second Semester 2024-2025",
                "priority": "high"
            },
            {
                "date": "2025-02-15",
                "type": "deadline",
                "title": "Add/Drop Deadline",
                "description": "Last day to add or drop courses",
                "priority": "high"
            }
        ],
        "current_period": "Regular Classes",
        "days_until_exams": 45,
        "next_registration": "2025-02-01"
    }
    """
```

### 4.7 `course_announcements`
**Description**: Manage and view course announcements
**Use Case**: Communication, important updates

```python
@mcp.tool()
async def course_announcements(
    action: str,  # "view", "create", "update"
    course_code: str,
    student_id: Optional[str] = None,
    faculty_id: Optional[str] = None,
    announcement_data: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    For action="view":
    Returns:
    {
        "course_code": "CS101",
        "announcements": [
            {
                "id": "ann_001",
                "title": "Assignment 2 Extended",
                "content": "Due to technical issues, Assignment 2 deadline extended to Feb 20",
                "posted_by": "Dr. Sarah Johnson",
                "posted_date": "2025-02-10T09:00:00Z",
                "priority": "high",
                "read_status": false,
                "expires": null
            }
        ],
        "unread_count": 2
    }
    
    For action="create" (Faculty):
    announcement_data = {
        "title": "Quiz Next Week",
        "content": "Quiz on Data Structures scheduled for Monday",
        "priority": "medium"
    }
    """
```

---

## 🇳🇬 5. MIVA-Specific Features

### 5.1 Nigerian University System Support

**Academic Levels**:
- **100 Level**: First year (Freshman equivalent)
- **200 Level**: Second year (Sophomore equivalent)  
- **300 Level**: Third year (Junior equivalent)
- **400 Level**: Fourth year (Senior equivalent)

**Semester System**:
- **First Semester**: October - February
- **Second Semester**: March - July
- **Summer Session**: August - September (optional)

**MIVA Student ID Format**:
```
MIVA/[YEAR]/[DEPT]/[NUMBER]
Example: MIVA/2024/CS/001
```

**Department Codes**:
- **CS**: Computer Science
- **ENG**: Engineering  
- **BUS**: Business Administration
- **MATH**: Mathematics

### 5.2 Authentication & Authorization

**Email Validation**: All users must have `@miva.edu.ng` email addresses

**Role-Based Access**:
- **Students**: Access to their own academic records, course materials, assignments
- **Faculty**: Access to courses they teach, student records for their courses
- **Admin**: Full access to all academic operations
- **Staff**: Limited access based on department function

**Permission Levels**:
```python
permissions = {
    "student": ["read_own_records", "submit_assignments", "view_courses"],
    "faculty": ["read_student_records", "create_assignments", "grade_submissions", "manage_courses"],
    "admin": ["full_access", "system_management", "user_management"],
    "staff": ["read_public_records", "basic_operations"]
}
```

---

## 🔧 Technical Implementation

### Database Integration

**Connection**: PostgreSQL database with 13 academic tables
**Schema**: Matches Better Chatbot application schema
**Connection Pool**: Async connection pooling for performance
**Security**: Prepared statements, input validation, role-based access

### MCP Server Structure

```python
from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("miva-academic")

# Database connection
async def get_db_connection():
    # Async PostgreSQL connection
    pass

# Example tool implementation
@mcp.tool()
async def get_course_materials(course_code: str, student_id: str) -> Dict[str, Any]:
    # Implementation
    pass
```

### Error Handling

```python
class MIVAAcademicError(Exception):
    """Base exception for MIVA Academic tools"""
    pass

class AuthenticationError(MIVAAcademicError):
    """User authentication failed"""
    pass

class AuthorizationError(MIVAAcademicError):
    """User not authorized for operation"""
    pass

class DataNotFoundError(MIVAAcademicError):
    """Requested data not found"""
    pass
```

---

## 🚀 Deployment & Usage

### Installation

```bash
# Clone and setup
cd mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Database setup
export DATABASE_URL="postgresql://user:pass@localhost:5432/miva_db"
export MIVA_SECRET_KEY="your-secret-key"

# Run server
python server.py --transport stdio  # For LM Studio, Claude Desktop
python server.py --transport sse --port 8080  # For web applications
```

### LLM Client Configuration

**Claude Desktop**:
```json
{
  "mcpServers": {
    "miva-academic": {
      "command": "python",
      "args": ["/path/to/mcp-server/server.py", "--transport", "stdio"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/miva_db"
      }
    }
  }
}
```

**LM Studio**:
```json
{
  "name": "MIVA Academic",
  "command": ["python", "/path/to/server.py", "--transport", "stdio"],
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/miva_db"
  }
}
```

### Usage Examples

**Student Queries**:
- "Show me my upcoming assignments for CS201"
- "What materials are available for week 3 of MATH201?"
- "What is my current GPA?"
- "Check my attendance for CS101"

**Faculty Queries**:
- "Create a new assignment for CS101 due February 20th"
- "Show attendance summary for my CS201 class"
- "List all students enrolled in my courses"
- "Generate grade report for student MIVA/2024/CS/001"

**Administrative Queries**:
- "Enroll student MIVA/2024/CS/001 in CS301"
- "Generate academic performance report for Computer Science department"
- "Show course capacity and enrollment statistics"
- "List faculty teaching load for current semester"

---

## 📚 API Reference Summary

| Tool Category | Tool Count | Primary Use Cases |
|---------------|------------|-------------------|
| **Course Management** | 4 tools | Course materials, schedules, enrollment info |
| **Assignments & Assessment** | 5 tools | Assignment tracking, submissions, grading, quiz management |
| **Academic Records** | 4 tools | Transcripts, GPA, attendance, academic standing |
| **Faculty & Administrative** | 7 tools | Faculty directory, enrollment management, reports, announcements |
| **Total** | **20 tools** | Complete academic data operations |

---

## 🔐 Security Considerations

1. **Authentication**: Required @miva.edu.ng email validation
2. **Authorization**: Role-based access control (student/faculty/admin)
3. **Data Privacy**: Students can only access their own records
4. **Audit Logging**: All academic operations logged for compliance
5. **Rate Limiting**: Prevent abuse of academic data access
6. **Input Validation**: All parameters validated and sanitized
7. **Secure Database**: Prepared statements, connection encryption

---

## 📝 Notes

- **Focus**: Real academic operations, not AI-powered features
- **Integration**: Designed for any LLM application via MCP
- **Scalability**: Async operations, database connection pooling
- **Compliance**: Nigerian university system requirements
- **Extensibility**: Easy to add new academic tools as needed

This specification provides a comprehensive foundation for the MIVA University Academic MCP Server, focusing on essential academic data operations and Nigerian university system requirements.
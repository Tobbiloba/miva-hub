# MIVA Academic MCP Server Setup Guide

## Overview

This guide walks you through setting up and running the MIVA University Academic MCP Server, which provides 20+ academic tools for LLM integration.

## Prerequisites

- Python 3.12 or higher
- PostgreSQL database (for production use)
- Virtual environment (recommended)

## Quick Start

### 1. Environment Setup

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies (when network is available)
pip install -e .

# Or install individual packages:
pip install "mcp>=1.4.1" "httpx>=0.28.1" "starlette>=0.46.1" "uvicorn>=0.34.0" "psycopg2>=2.9.0" "python-dotenv>=1.0.0"
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

Update `.env` with your database credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/miva_academic"
DB_HOST="localhost"
DB_PORT=5432
DB_NAME="miva_academic"
DB_USER="your_username"
DB_PASSWORD="your_password"
```

### 3. Testing

```bash
# Run basic functionality test
python3 test_server.py
```

Expected output:
```
✓ Database module imported successfully
✓ Course materials retrieved: 2 items
✓ Assignments retrieved: 2 items
✓ Course info retrieved for: CS101
✓ Server tools defined correctly
```

### 4. Running the Server

#### For LLM clients (Claude Desktop, LM Studio, etc.)
```bash
python server.py --transport stdio
```

#### For web-based integration
```bash
python server.py --transport sse --host 0.0.0.0 --port 8080
```

## Available Academic Tools

### Course Management (5 tools)
1. **get_course_materials** - Fetch course materials by week/type
2. **get_course_info** - Get detailed course information  
3. **list_enrolled_courses** - List student's enrolled courses
4. **get_course_schedule** - Get class schedule and times
5. **get_upcoming_assignments** - Get prioritized assignment deadlines

### Assignment & Assessment (3 tools)
6. **submit_assignment** - Submit assignments with file uploads
7. **get_grades** - Get grades and feedback
8. **create_assignment** - Create new assignments (faculty)

### Academic Records (4 tools)
9. **get_transcript** - Official academic transcript
10. **track_attendance** - Attendance records and analysis
11. **get_gpa_calculation** - GPA calculation with breakdown
12. **academic_standing** - Academic status and warnings

### Faculty & Administrative (8+ tools)
13. **find_faculty** - Faculty directory search
14. **get_office_hours** - Faculty office hours
15. **faculty_course_load** - Course assignments for faculty
16. **student_enrollment** - Enrollment management
17. **generate_academic_report** - Academic performance reports
18. **academic_calendar** - University calendar events
19. **course_announcements** - Course-specific announcements
20. **manage_quizzes** - Quiz creation and management

## Integration with LLM Clients

### Claude Desktop
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "miva-academic": {
      "command": "python",
      "args": ["/path/to/mcp-server/server.py", "--transport", "stdio"],
      "env": {
        "DATABASE_URL": "your_database_url"
      }
    }
  }
}
```

### LM Studio
1. Start server in SSE mode: `python server.py --transport sse --port 8080`
2. Configure LM Studio to connect to `http://localhost:8080/sse`

### Continue.dev / Cursor
Add to your configuration:
```json
{
  "mcp": {
    "servers": {
      "miva-academic": {
        "command": "python",
        "args": ["/path/to/server.py", "--transport", "stdio"]
      }
    }
  }
}
```

## Database Integration

### Development (Placeholder Data)
The server currently runs with placeholder data for testing. All tools return sample academic information.

### Production (PostgreSQL)
To connect to the actual MIVA University database:

1. Update `database.py` with real PostgreSQL connection code
2. Configure connection string in `.env`
3. Ensure database schema matches the MIVA academic structure

### Database Schema Requirements
The server expects these tables:
- `departments` - Academic departments
- `courses` - Course catalog
- `faculty` - Faculty directory
- `students` - Student records
- `enrollments` - Course enrollments
- `course_materials` - Learning materials
- `assignments` - Assignment definitions
- `submissions` - Assignment submissions
- `grades` - Grading records
- `schedules` - Class schedules
- `announcements` - Course announcements
- `academic_calendar` - University calendar
- `attendance` - Attendance tracking

## Nigerian University System Support

The server fully supports the Nigerian university system:

- **Academic Levels**: 100, 200, 300, 400 Level (not Freshman/Sophomore)
- **Semesters**: First Semester, Second Semester
- **Grading**: Nigerian grading scale and GPA calculation
- **Academic Calendar**: Nigerian academic year structure

## Troubleshooting

### Common Issues

1. **ImportError: No module named 'mcp'**
   ```bash
   pip install mcp>=1.4.1
   ```

2. **Database connection failed**
   - Check DATABASE_URL in .env file
   - Ensure PostgreSQL is running
   - Verify database credentials

3. **Port already in use**
   ```bash
   # Change port number
   python server.py --transport sse --port 8081
   ```

4. **Permission denied**
   ```bash
   # Make server executable
   chmod +x server.py
   ```

### Development Mode

For development with auto-reload:
```bash
uvicorn server:starlette_app --reload --port 8080
```

## Deployment

### Production Deployment
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn server:create_starlette_app --bind 0.0.0.0:8080
```

### Docker Deployment
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install -e .

EXPOSE 8080
CMD ["python", "server.py", "--transport", "sse", "--port", "8080"]
```

## Security Considerations

- Always use environment variables for database credentials
- Enable SSL for production deployments
- Implement proper authentication and authorization
- Validate all input parameters
- Use connection pooling for database operations

## Support

For issues and contributions:
- Check the MIVA_ACADEMIC_TOOLS.md for complete tool documentation
- Review test_server.py for usage examples
- Ensure all dependencies are properly installed

## Next Steps

1. Install MCP dependencies when network is available
2. Configure actual database connection
3. Implement real database queries in `database.py`
4. Test with your preferred LLM client
5. Deploy to production environment
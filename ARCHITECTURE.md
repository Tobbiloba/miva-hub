# System Architecture Overview

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Frontend (Next.js)](#frontend-nextjs)
3. [MCP Client & Tool System](#mcp-client--tool-system)
4. [MCP Server (Python)](#mcp-server-python)
5. [Study Buddy API](#study-buddy-api)
6. [Content Processor API](#content-processor-api)
7. [Database (PostgreSQL)](#database-postgresql)
8. [File Storage (AWS S3)](#file-storage-aws-s3)
9. [Data Flow Examples](#data-flow-examples)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Chat UI    │  │ Admin Panel  │  │Student/Faculty│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│  ┌──────▼──────────────────▼──────────────────▼───────┐         │
│  │         MCP Clients Manager & Tool Kit              │         │
│  │  (Visualization, Academic, Code Execution Tools)    │         │
│  └──────┬────────────────────────────────────┬─────────┘         │
└─────────┼────────────────────────────────────┼───────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────┐            ┌──────────────────────┐
│   MCP Server (SSE)  │            │   PostgreSQL (Neon)  │
│   Port: 8080/3001   │◄──────────►│   Unified Database   │
└──────────┬──────────┘            └──────────────────────┘
           │                                    ▲
           │                                    │
┌──────────┼────────────────────────────────────┼──────────┐
│          ▼                                    │          │
│  ┌──────────────────┐    ┌──────────────────┴───────┐  │
│  │  Study Buddy API │    │ Content Processor API    │  │
│  │   Port: 8083     │    │      Port: 8082          │  │
│  └──────────────────┘    └────────┬─────────────────┘  │
│                                   │                     │
│                           ┌───────▼─────────┐          │
│                           │   AWS S3 Bucket │          │
│                           │ (Video/Files)   │          │
│                           └─────────────────┘          │
└────────────────────────────────────────────────────────┘
```

---

## Frontend (Next.js)

**Location**: `/frontend`

### Purpose
Modern full-stack application providing UI for students, faculty, and admins.

### Key Components

#### 1. **Chat Interface** (`/app/(chat)`)
- AI-powered chatbot for academic assistance
- Real-time streaming responses
- Tool invocation UI (charts, tables, flashcards)
- Message history with PostgreSQL storage

#### 2. **Admin Panel** (`/app/admin`)
- Course management (CRUD operations)
- Content upload (videos, PDFs, documents)
- Student/faculty management
- Analytics dashboard

#### 3. **Student Portal** (`/app/student`)
- View enrolled courses
- Submit assignments
- Track progress
- Access course materials

#### 4. **Faculty Portal** (`/app/faculty`)
- Grade assignments
- Manage course content
- View student analytics

### Authentication
- **Better Auth** library for session management
- Supports email/password, Google OAuth
- Role-based access control (student, faculty, admin)
- Session data stored in PostgreSQL

---

## MCP Client & Tool System

**Location**: `/frontend/src/lib/ai`

### MCP Clients Manager

**File**: `mcp/create-mcp-clients-manager.ts`

Manages connections to multiple MCP servers:
- **SSE Transport**: Server-Sent Events for real-time communication
- **Auto-reconnect**: Handles disconnections automatically
- **Tool Discovery**: Fetches available tools from each MCP server
- **Connection Pooling**: Reuses connections, auto-disconnect after 30min idle

**Storage Options**:
- Database storage (default): Saves MCP configs to PostgreSQL
- Memory storage: Temporary configs (dev mode)
- File storage: JSON-based config files

### Tool Kit System

**File**: `tools/tool-kit.ts`

Provides tools to the AI chatbot:

#### Built-in Visualization Tools
- `createPieChart`: Generate pie charts from data
- `createBarChart`: Generate bar charts
- `createLineChart`: Generate line charts
- `createTable`: Display tabular data
- `createFlashcards`: Study flashcards
- `createQuiz`: Interactive quizzes

#### Academic Visualization Tools
**Location**: `tools/visualization/`
- `createCourseMaterialsOverview`: Display course content overview
- `createPerformanceDashboard`: Student performance metrics
- `createProgressTracker`: Track assignment completion
- `createStudyPlan`: Personalized study schedules

#### Code Execution Tools
- `mini-javascript-execution`: Run JavaScript snippets safely
- `python-execution`: Execute Python code in sandboxed environment

#### MCP-Connected Tools
Tools fetched dynamically from MCP servers (academic queries, content access, etc.)

### How Tools Work

1. **User asks question** → Chat API receives request
2. **AI selects tool** → Based on context (e.g., "show my courses")
3. **Tool executes** → Either locally (visualization) or via MCP server (database queries)
4. **Results rendered** → React components display charts, tables, etc.

---

## MCP Server (Python)

**Location**: `/mcp-server`

### Purpose
Python-based Model Context Protocol server providing academic tools to the chatbot.

### Architecture

**Main Server**: `src/mcp/server.py`
- FastMCP framework for tool registration
- SSE (Server-Sent Events) transport for real-time communication
- Runs on port 8080 (or 3001 for local dev)

### Available Tools

#### Course Management
- `get_course_materials`: Fetch lectures, readings, assignments
- `get_course_info`: Detailed course information
- `list_enrolled_courses`: Student's enrolled courses
- `get_course_schedule`: Class timetables

#### Assignments & Deadlines
- `get_upcoming_assignments`: Assignments due in next N days
- `view_assignment_info`: Assignment details (read-only)

#### Content Access
- `get_course_videos`: Video lectures by week/type
- `get_reading_materials`: PDFs, documents, external links
- `view_course_announcements`: Course updates
- `get_course_syllabus`: Learning objectives, assessment structure

#### Faculty & Support
- `get_faculty_contact`: Instructor office hours, emails

### Database Integration

**File**: `src/core/database.py`

- **AcademicRepository**: Handles all database operations
- **Connection**: Uses same PostgreSQL database as frontend
- **Driver**: `psycopg2` with `RealDictCursor` for dict results
- **Async**: Uses `asyncio.to_thread()` for non-blocking DB calls

**Environment Variables**:
```bash
POSTGRES_URL=postgresql://user:pass@host:port/database
```

### Running the Server

**Option 1 - SSE Mode** (for production/web):
```bash
python src/mcp/server.py --transport sse --port 8080
```

**Option 2 - STDIO Mode** (for local CLI testing):
```bash
python src/mcp/server.py --transport stdio
```

---

## Study Buddy API

**Location**: `/mcp-server/src/api/study_buddy_api.py`

### Purpose
Specialized FastAPI service for AI-powered study assistance.

**Port**: 8083

### Features
- **Q&A Generation**: Creates study questions from course content
- **Concept Explanations**: Simplifies complex topics
- **Study Plans**: Generates personalized study schedules
- **Note Summarization**: Condenses lecture notes

### Integration
- Called by frontend via HTTP requests
- Uses OpenAI/Claude APIs for AI processing
- Accesses course materials from S3 and database

**Endpoints**:
- `POST /api/study-buddy/generate-questions`
- `POST /api/study-buddy/explain-concept`
- `POST /api/study-buddy/create-study-plan`

---

## Content Processor API

**Location**: `/mcp-server/src/api/enhanced_content_processor_api.py`

### Purpose
Handles AI processing of uploaded course materials (videos, PDFs, documents).

**Port**: 8082

### Features

#### 1. **Video Processing**
- Transcription using Whisper AI
- Timestamp generation
- Key concept extraction
- Summary generation

#### 2. **Document Processing**
- PDF text extraction
- Section identification
- Key points extraction
- Searchable indexing

#### 3. **AI Enhancement**
- Generates study questions
- Creates flashcards
- Identifies learning objectives
- Builds concept maps

### Processing Pipeline

```
Upload → S3 Storage → Background Job → AI Processing → Database Storage
```

1. Admin uploads file via frontend
2. File saved to S3 with structured path
3. Processing job created (job ID returned)
4. Worker processes file asynchronously
5. Results stored in `ai_processed_content` table

**Endpoints**:
- `POST /process-content`: Start processing job
- `GET /processing-status/{jobId}`: Check job status
- `GET /processed-content/{materialId}`: Get processed data

---

## Database (PostgreSQL)

**Provider**: Neon (Serverless PostgreSQL)

### Unified Database
Both frontend and MCP server use the **same database** for consistency.

### Key Tables

#### User Management
- `user`: Users (students, faculty, admin)
- `account`: OAuth accounts
- `session`: Active sessions

#### Academic Structure
- `institution`: Universities/schools
- `department`: Academic departments
- `course`: Course catalog
- `course_instructor`: Faculty-course assignments
- `student_enrollment`: Student course registrations

#### Content Management
- `course_material`: Uploaded files (videos, PDFs)
- `ai_processed_content`: AI-generated summaries, transcripts
- `course_week`: Weekly course structure
- `announcement`: Course announcements

#### Assignments & Grading
- `assignment`: Assignments and deadlines
- `assignment_submission`: Student submissions
- `grade`: Grading records

#### Chat & MCP
- `chat`: Chat conversations
- `message`: Individual messages
- `mcp_server`: MCP server configurations
- `mcp_tool_access_log`: Tool usage tracking

### ORM & Migrations
- **Drizzle ORM**: Type-safe database queries
- **Migrations**: `/frontend/src/lib/db/migrations/pg/`
- Schema defined in: `/frontend/src/lib/db/pg/schema.pg.ts`

---

## File Storage (AWS S3)

**Bucket**: `miva-university-content`

### Purpose
Stores all course materials (videos, PDFs, presentations, audio).

### Path Structure

```
s3://miva-university-content/
  └── {department}/              # e.g., "cos" (Computer Science)
      └── {course-code}/          # e.g., "cos202"
          └── {semester}/         # e.g., "2024-fall"
              └── {material-type}/ # "videos", "documents", "presentations"
                  └── week-{N}/   # e.g., "week-1"
                      └── {filename}
```

**Example Path**:
```
cos/cos202/2024-fall/videos/week-1/introduction-to-oop.mp4
```

### Upload Flow

1. **Admin uploads file** → `/frontend/src/app/api/content/upload/route.ts`
2. **File validation** → Type check (PDF, MP4, PPTX, etc.), size limit (100MB)
3. **S3 path generation** → Based on course, department, week, material type
4. **Upload to S3** → Using AWS SDK (boto3/S3 client)
5. **Database record** → Save metadata to `course_material` table
6. **Background processing** → Trigger Content Processor API

### S3 Service

**Frontend**: `/frontend/src/lib/aws/s3-service.ts`
**Backend**: `/mcp-server/src/core/s3_service.py`

**Features**:
- Signed URLs for secure access
- Multipart upload for large files
- Automatic path generation
- CloudFront CDN integration (optional)

---

## Data Flow Examples

### Example 1: Student Asks "What are my courses?"

```
1. User types in chat → "Show me my enrolled courses"

2. Frontend sends to /api/chat
   - Message stored in database
   - AI analyzes query

3. AI selects tool: "list_enrolled_courses"
   - Tool routed to MCP server

4. MCP Server executes tool
   - Calls academic_repo.get_student_enrollments(student_id)
   - Queries PostgreSQL for enrollments
   - Returns JSON with courses

5. Frontend receives tool result
   - Tool component renders course list
   - User sees formatted course cards

6. AI generates natural language response
   - "Here are your 5 enrolled courses for Fall 2024..."
```

### Example 2: Admin Uploads Video Lecture

```
1. Admin uploads MP4 file via Admin Panel
   - Course: COS202
   - Week: 3
   - Type: Lecture

2. Frontend POST /api/content/upload
   - Validates file (type, size)
   - Gets course/department info from DB

3. S3 Upload
   - Path: cos/cos202/2024-fall/videos/week-3/sorting-algorithms.mp4
   - Returns S3 URL

4. Database Record
   - Insert into course_material table
   - Links to course, week, type

5. Background Processing (async)
   - POST to Content Processor API
   - Job ID: "job-abc123"

6. Content Processor API
   - Downloads video from S3
   - Runs Whisper transcription
   - Extracts key concepts with AI
   - Generates study questions

7. Results Saved
   - Insert into ai_processed_content
   - Transcript, summary, concepts, questions

8. Student Access
   - Student queries "Show week 3 videos"
   - MCP tool fetches from database
   - Returns video + AI-generated summary
```

### Example 3: Creating Performance Dashboard

```
1. User asks: "How am I performing in my courses?"

2. AI selects tool: "createPerformanceDashboard"
   - This is a frontend visualization tool

3. Tool fetches student data
   - GET /api/student/dashboard
   - Returns grades, assignments, completion rates

4. React Component Renders
   - File: /frontend/src/components/tool-invocation/performance-dashboard.tsx
   - Displays charts, progress bars, grade breakdown

5. User sees interactive dashboard
   - GPA trends
   - Assignment completion
   - Course-by-course performance
```

---

## Key Technologies

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Auth**: Better Auth
- **ORM**: Drizzle
- **AI**: Vercel AI SDK
- **Charts**: Recharts
- **State**: React Context + Hooks

### Backend (MCP Server)
- **Language**: Python 3.11+
- **Framework**: FastMCP, FastAPI
- **Database**: psycopg2 (PostgreSQL)
- **AI**: OpenAI, Anthropic Claude
- **Storage**: boto3 (AWS S3)
- **Async**: asyncio

### Infrastructure
- **Database**: Neon PostgreSQL (Serverless)
- **Storage**: AWS S3 (us-east-1)
- **CDN**: CloudFront (optional)
- **Deployment**: Railway/Vercel (frontend), Railway (backend)

---

## Environment Setup

### Frontend `.env`
```bash
# Database
POSTGRES_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=miva-university-content
AWS_REGION=us-east-1

# MCP Server
MCP_SERVER_URL=http://localhost:3001/sse
CONTENT_PROCESSOR_URL=http://localhost:8082
```

### MCP Server `.env`
```bash
# Database (same as frontend)
POSTGRES_URL=postgresql://...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=miva-university-content
AWS_REGION=us-east-1

# Server
HOST=0.0.0.0
PORT=8080
```

---

## Running the Full Stack

### Development Mode

**Terminal 1 - Frontend**:
```bash
cd frontend
npm run dev  # Runs on http://localhost:3000
```

**Terminal 2 - All MCP Services**:
```bash
cd mcp-server
python main.py  # Starts all 3 services:
# - MCP Server (8080)
# - Content Processor (8082)
# - Study Buddy (8083)
```

**OR run individually**:
```bash
# Terminal 2 - MCP Server
python src/mcp/server.py --transport sse --port 8080

# Terminal 3 - Content Processor
python src/api/enhanced_content_processor_api.py

# Terminal 4 - Study Buddy
python src/api/study_buddy_api.py
```

### Production Deployment

**Frontend**: Vercel
- Auto-deploys from `main` branch
- Environment variables in Vercel dashboard

**Backend**: Railway
- Deploy each service separately
- Set environment variables in Railway

---

## Security & Compliance

### FERPA Compliance
- Student data encrypted at rest (PostgreSQL)
- Encrypted in transit (HTTPS/TLS)
- Access control via Better Auth
- Audit logging for MCP tool access

### AWS S3 Security
- Private bucket (not public)
- Signed URLs with expiration
- IAM roles with minimal permissions
- Encryption enabled (AES-256)

### Authentication
- Bcrypt password hashing
- Session tokens with expiration
- Role-based access control
- OAuth 2.0 for Google login

---

## Development Tips

### Testing MCP Tools
Use Drizzle Studio to inspect database:
```bash
cd frontend
npx drizzle-kit studio
```

### Debugging
- Frontend: Check browser console + Network tab
- MCP Server: Logs in `mcp_server.log`
- Database: Use `psql` or Drizzle Studio

### Adding New Tools

**Frontend Tool**:
1. Create tool in `/frontend/src/lib/ai/tools/`
2. Add to `tool-kit.ts`
3. Create React component in `/components/tool-invocation/`

**MCP Server Tool**:
1. Add function with `@mcp.tool()` decorator in `server.py`
2. Implement database logic in `database.py`
3. Restart MCP server

---

## Conclusion

This system combines modern web technologies (Next.js, React) with Python-based AI services to create a comprehensive academic platform. The MCP protocol enables the chatbot to access real academic data, while visualization tools make information digestible. Content processing pipelines enhance uploaded materials with AI-generated summaries and study aids.

# 🏗️ MIVA University MCP Server - Clean Structure

## 📁 Project Organization

```
mcp-server/
├── main.py                     # 🚀 Main launcher for all services
├── src/                        # 📦 Source code
│   ├── mcp/                   # 🧠 MCP Server
│   │   ├── server.py          # 📜 Legacy monolithic server
│   │   ├── server_clean.py    # ✨ New structured server
│   │   └── tools/             # 🛠️ Organized tool modules
│   │       ├── course_tools.py      # 📚 Course management (7 tools)
│   │       ├── assignment_tools.py  # 📝 Assignment management (2 tools)
│   │       ├── schedule_tools.py    # 📅 Schedule management (1 tool)
│   │       └── faculty_tools.py     # 👨‍🏫 Faculty information (1 tool)
│   ├── api/                   # ⚡ FastAPI Services
│   │   └── enhanced_content_processor_api.py  # Phase 3A implementation
│   ├── core/                  # 🔧 Core modules
│   │   ├── database.py        # 🗄️ Database operations
│   │   └── ai_integration.py  # 🤖 AI model integration
│   └── data/                  # 📊 Data files
│       └── content.md         # 📖 Course content
├── sql/                       # 🗄️ Database scripts
│   ├── ai_database_enhancement.sql
│   └── create_dummy_data.sql
├── docs/                      # 📚 Documentation
│   ├── README.md
│   ├── MIVA_ACADEMIC_TOOLS.md
│   └── AI_CONTENT_PROCESSING_IMPLEMENTATION.md
└── uploads/                   # 📁 File uploads
```

## 🚀 Quick Start

### Start All Services
```bash
python3 main.py
```

### Individual Services
```bash
# MCP Server only
python3 src/mcp/server_clean.py

# Content Processor only  
python3 src/api/enhanced_content_processor_api.py
```

## 📊 Service Endpoints

- **🧠 MCP Server**: http://localhost:8080
- **⚡ Content Processor**: http://localhost:8082
- **📖 API Documentation**: http://localhost:8082/docs

## 🛠️ MCP Tools (11 Total)

### 📚 Course Management (7 tools)
- `get_course_materials` - Get course materials with filters
- `get_course_info` - Detailed course information
- `list_enrolled_courses` - Student's enrolled courses
- `get_course_videos` - Video materials
- `get_reading_materials` - Reading assignments
- `view_course_announcements` - Course announcements
- `get_course_syllabus` - Complete syllabus

### 📝 Assignment Management (2 tools)
- `get_upcoming_assignments` - Upcoming assignments
- `view_assignment_info` - Assignment details

### 📅 Schedule Management (1 tool)
- `get_course_schedule` - Class schedules and timetable

### 👨‍🏫 Faculty Information (1 tool)
- `get_faculty_contact` - Faculty contact information

## ✨ Clean Architecture Benefits

- **🔍 Modular**: Tools organized by functionality
- **📦 Maintainable**: Separated concerns and clear structure  
- **🚀 Scalable**: Easy to add new tool categories
- **🧪 Testable**: Individual modules can be tested separately
- **📖 Readable**: Clear naming and organization

## 🔄 Migration from Legacy

- **Old**: Single `server.py` with all 11 tools mixed together
- **New**: Organized into 4 logical tool modules
- **Compatibility**: Both servers available during transition
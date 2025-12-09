# Askly - Project Overview

## What is This?

**Askly** is a complete digital university platform that automates student enrollment, course management, assignment grading, and faculty administration. Features an AI assistant that helps students with coursework, answers academic questions, and provides personalized learning support.

### Key Features:
- 🎓 **Student Enrollment** - Automated student registration and course enrollment system
- 📚 **Course Management** - Comprehensive course catalog, materials, and scheduling
- ✅ **Assignment Grading** - AI-powered automated grading with faculty oversight
- 👨‍🏫 **Faculty Administration** - Complete faculty management and course administration tools
- 🤖 **AI Study Assistant** - Intelligent AI assistant that helps with coursework and academic questions
- 📖 **Personalized Learning** - Adaptive learning support tailored to each student's needs
- 📊 **Academic Analytics** - Track student progress, grades, and performance metrics
- 🔔 **Notifications** - Real-time updates for assignments, grades, and announcements

---

## Tools & Capabilities

### 🔧 Default Built-in Tools

#### **Web Tools**
- `webSearch` - Semantic web search using Exa AI
- `webContent` - Extract and analyze content from URLs
- `http` - Make HTTP requests to any API

#### **Code Execution Tools**
- `mini-javascript-execution` - Execute JavaScript code
- `python-execution` - Execute Python code

#### **📊 Advanced Data Visualization Tools**

Askly features a powerful suite of visualization tools powered by **Recharts** that transform raw data into beautiful, interactive visualizations:

- **`createTable`** - Create sophisticated interactive data tables with:
  - Multi-column sorting and real-time filtering
  - Global search with automatic highlighting
  - Export to CSV/Excel formats
  - Column visibility controls
  - Pagination for large datasets
  - Smart data type formatting (strings, numbers, dates, booleans)

- **`createBarChart`** - Generate professional bar charts for:
  - Comparing values across categories
  - Time-series comparisons
  - Multi-series data visualization
  - Customizable colors and styling

- **`createLineChart`** - Create elegant line charts to visualize:
  - Trends over time
  - Continuous data patterns
  - Multi-metric comparisons
  - Performance tracking

- **`createPieChart`** - Build interactive pie charts for:
  - Proportional data distribution
  - Percentage breakdowns
  - Category comparisons
  - Visual data storytelling

All visualizations are fully interactive, responsive, and can be embedded directly in AI conversations, making data analysis seamless and intuitive.

#### **Academic Tools** (Askly-specific)
- `get-course-materials` - Get course materials for enrolled students
- `get-upcoming-assignments` - Track upcoming assignments
- `find-faculty` - Search faculty directory
- `get-academic-schedule` - Get academic calendar and schedules

#### **Academic Visualization Tools**
- `createFlashcards` - Create study flashcards
- `createQuiz` - Generate quiz questions
- `createExam` - Create exam simulations
- `createAssignment` - Generate assignment templates
- `createCourseMaterial` - Format course materials
- `createSchedule` - Visualize schedules
- `createCourseList` - Display course lists
- `createAssignmentList` - Display assignment lists

---

### 🔌 Model Context Protocol (MCP) Integration

Askly leverages the **Model Context Protocol (MCP)** to create an extensible, powerful ecosystem that seamlessly connects AI capabilities with real-world tools and data. MCP enables our platform to dynamically extend functionality through modular server integrations, making Askly infinitely customizable and powerful.

#### **Why MCP Matters**
- 🚀 **Extensible Architecture** - Add new capabilities without modifying core code
- 🔗 **Seamless Integration** - Connect with external services and APIs effortlessly
- 🎯 **Context-Aware** - AI assistants understand and utilize tools intelligently
- 🔧 **Developer-Friendly** - Build custom MCP servers for specialized needs
- ⚡ **Real-Time Execution** - Tools execute in real-time during AI conversations

#### **Recommended MCP Servers:**
Askly supports a wide range of MCP servers that extend platform capabilities:

1. **GitHub** - Repository management, issue tracking, and code collaboration
2. **Notion** - Workspace integration for notes, databases, and documentation
3. **Linear** - Project management and issue tracking
4. **Playwright** - Browser automation and web scraping
5. **Neon** - Serverless PostgreSQL database operations
6. **Stripe** - Payment processing and subscription management
7. **PayPal** - Alternative payment gateway integration
8. **Canva** - Design tool integration for visual content creation
9. **Atlassian** - Jira, Confluence, and full Atlassian suite integration
10. **Asana** - Task and project management workflows

---

### 🎓 Askly Academic MCP Server (Custom-Built)

Our **custom-built Python MCP server** is the heart of Askly's academic intelligence, providing **13 specialized learning-focused tools** that seamlessly integrate with our AI assistant. This powerful server connects directly to our PostgreSQL database, enabling real-time academic operations and intelligent learning support.

#### **Course Management**
- `get_course_materials` - Fetch course materials (lectures, readings, assignments, quizzes, videos)

#### **Assignment Management**
- `get_upcoming_assignments` - Get upcoming assignments with filters

#### **Schedule Management**
- `get_study_schedule` - Get personalized study schedules

#### **Study Buddy Tools** (4 tools)
- `generate_study_plan` - Create personalized study plans
- `create_flashcards` - Generate flashcards from course content
- `quiz_generator` - Create practice quizzes
- `study_session_tracker` - Track and manage study sessions

#### **Content Navigation**
- `navigate_course_content` - Navigate through course materials

#### **Deep Learning**
- `deep_learning_recommendations` - Get AI-powered learning recommendations

#### **Exam Tools** (2 tools)
- `exam_simulator` - Simulate exam conditions
- `exam_prep_guide` - Generate exam preparation guides

#### **Notes Conversion** (2 tools)
- `convert_to_notes` - Convert content to study notes
- `export_notes` - Export notes in various formats

---

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, Radix UI, Tailwind CSS
- **Backend**: Next.js 15 API Routes, Python MCP Server
- **Database**: PostgreSQL, Drizzle ORM
- **Authentication**: Better Auth
- **AI Integration**: AI SDK (Anthropic/OpenAI)
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **Notifications**: Sonner
- **Validation**: Zod

---

## Project Structure

```
better-chatbot-main/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and AI tools
│   │   └── hooks/        # React hooks
│   └── public/           # Static assets
├── mcp-server/           # Askly Academic MCP server (Python)
│   └── src/
│       ├── mcp/         # MCP server implementation
│       ├── core/        # Core functionality
│       └── data/        # Data files
└── docker/              # Docker configuration
```

---

## Key Features in Detail

### 1. **Multi-AI Provider Support**
Switch between different LLM providers seamlessly. Supports all major providers with unified interface.

### 2. **MCP Protocol Integration** 🚀
Askly's MCP integration is a game-changer for extensibility. The platform supports:
- **Custom MCP Servers** - Build specialized servers for unique use cases
- **Seamless Tool Access** - Invoke any MCP tool via `@toolname` mentions in conversations
- **Real-Time Execution** - Tools execute instantly during AI interactions
- **Context Preservation** - AI maintains full context across tool executions
- **Academic MCP Server** - Our custom Python server with 13 specialized academic tools
- **Third-Party Integrations** - Connect with GitHub, Notion, Linear, and 7+ other services

### 3. **Custom Agents**
Create specialized AI agents with custom instructions and tool access. Invoke with `@agent_name`.

### 4. **Visual Workflows**
Build visual workflows by connecting AI reasoning nodes and tool execution nodes. Publish as reusable tools.

### 5. **Advanced Visualization Engine** 📊
Askly's visualization capabilities are powered by **Recharts**, one of the most powerful React charting libraries. Our visualization tools enable:
- **Interactive Data Tables** - Full-featured tables with sorting, filtering, search, and export
- **Dynamic Chart Generation** - Bar, line, and pie charts generated on-the-fly from conversation data
- **Real-Time Updates** - Visualizations update instantly as data changes
- **Embedded in Conversations** - Charts and tables appear directly in AI chat responses
- **Export Capabilities** - Download visualizations as CSV, Excel, or images
- **Responsive Design** - All visualizations adapt to any screen size
- **Academic Visualizations** - Specialized charts for grades, schedules, course lists, and more

### 6. **Voice Assistant**
Realtime voice chat powered by OpenAI's Realtime API with full tool integration.

### 7. **Tool Choice Modes**
- **Auto**: LLM automatically uses tools when needed
- **Manual**: LLM asks permission before using tools
- **None**: Disable all tool usage

### 8. **University Platform Features**
Complete digital university ecosystem including:
- Automated student enrollment and registration
- Course catalog and material management
- Assignment creation, submission, and AI-powered grading
- Faculty administration and course management
- AI-powered study assistant for coursework help
- Personalized learning recommendations
- Academic calendar and scheduling
- Grade tracking and analytics

---

## Environment Requirements

### Required:
- Node.js >= 18
- PostgreSQL database
- At least one LLM provider API key

### Optional:
- Redis (for caching)
- Exa API key (for web search)
- OAuth credentials (Google, GitHub, Microsoft)
- AWS S3 (for file storage)

---

## Quick Start

```bash
# Install dependencies
pnpm i

# Start PostgreSQL (optional if you have your own)
pnpm docker:pg

# Configure .env file with API keys

# Build and start
pnpm build:local && pnpm start
```

Visit `http://localhost:3000` to get started.

---

## Use Cases

1. **Student Portal** - Complete student experience with enrollment, courses, assignments, and AI study support
2. **Faculty Dashboard** - Course management, assignment creation, grading, and student administration
3. **Academic Administration** - Automated enrollment, course scheduling, and academic record management
4. **AI-Powered Learning** - Personalized study assistance, coursework help, and academic question answering
5. **Assignment Management** - Create, submit, and grade assignments with AI-assisted evaluation
6. **Academic Analytics** - Track student performance, course completion, and learning outcomes

---

## Deployment Options

- **Vercel** - Recommended for frontend hosting
- **Railway** - For full-stack deployment
- **Docker** - Self-hosting with Docker Compose
- **Custom Server** - Deploy anywhere Node.js runs

---

Askly transforms traditional university operations into a modern, automated, AI-powered digital platform that enhances both student learning and faculty efficiency. 🚀


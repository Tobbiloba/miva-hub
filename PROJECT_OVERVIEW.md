# Miva Hub - Project Overview

## What is This?

**Miva Hub** is an open-source AI chatbot platform built with Next.js and Vercel AI SDK. It's an intelligent chatbot hub that combines features from ChatGPT, Claude, Grok, and Gemini into one unified platform.

### Key Features:
- 🤖 **Multi-AI Support** - Works with OpenAI, Anthropic, Google, xAI, Ollama, and more
- 🛠️ **MCP Protocol Support** - Integrates Model Context Protocol servers for extended functionality
- 🎙️ **Voice Assistant** - Realtime voice chat with full tool integration
- 👥 **Collaboration** - Share agents, workflows, and configurations with teams
- 📊 **Data Visualization** - Create charts, tables, and interactive visualizations
- 🔍 **Web Search** - Semantic web search powered by Exa AI
- 💻 **Code Execution** - Run JavaScript and Python code directly in chats
- 🎯 **Custom Agents & Workflows** - Create specialized AI assistants and automated workflows
- 📱 **Landing Page** - Marketing landing page for the platform

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

#### **Data Visualization Tools**
- `createTable` - Create interactive data tables with sorting, filtering, and export
- `createBarChart` - Generate bar charts
- `createLineChart` - Generate line charts
- `createPieChart` - Generate pie charts

#### **Academic Tools** (MIVA-specific)
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

### 🔌 MCP Server Tools (Model Context Protocol)

MCP servers extend the platform's capabilities.`You can add custom MCP servers or use recommended ones:

#### **Recommended MCP Servers:**
1. **GitHub** - GitHub repository management
2. **Notion** - Notion workspace integration
3. **Linear** - Project management with Linear
4. **Playwright** - Browser automation
5. **Neon** - Database operations
6. **Stripe** - Payment processing
7. **PayPal** - Payment processing
8. **Canva** - Design tool integration
9. **Atlassian** - Atlassian suite integration
10. **Asana** - Task management

---

### 🎓 MIVA Academic MCP Server (Custom)

A specialized MCP server for MIVA University with **13 learning-focused tools**:

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

x

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
├── mcp-server/           # MIVA Academic MCP server (Python)
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

### 2. **MCP Protocol Integration**
Add custom MCP servers to extend functionality. Tools from MCP servers become available via `@toolname` mentions.

### 3. **Custom Agents**
Create specialized AI agents with custom instructions and tool access. Invoke with `@agent_name`.

### 4. **Visual Workflows**
Build visual workflows by connecting AI reasoning nodes and tool execution nodes. Publish as reusable tools.

### 5. **Voice Assistant**
Realtime voice chat powered by OpenAI's Realtime API with full tool integration.

### 6. **Tool Choice Modes**
- **Auto**: LLM automatically uses tools when needed
- **Manual**: LLM asks permission before using tools
- **None**: Disable all tool usage

### 7. **Academic Features** (MIVA-specific)
Specialized tools for students including:
- Course material access
- Assignment tracking
- Study planning
- Exam preparation
- Faculty directory
- Academic scheduling

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

1. **General AI Assistant** - Chat with multiple LLMs in one place
2. **Academic Learning Platform** - MIVA students can access course materials and study tools
3. **Developer Tool** - Code execution, GitHub integration, workflow automation
4. **Research Assistant** - Web search, content extraction, data visualization
5. **Business Automation** - Custom agents and workflows for business processes
6. **Voice Assistant** - Hands-free AI interaction

---

## Deployment Options

- **Vercel** - Recommended for frontend hosting
- **Railway** - For full-stack deployment
- **Docker** - Self-hosting with Docker Compose
- **Custom Server** - Deploy anywhere Node.js runs

---

This platform brings together the best features of modern AI assistants into one powerful, extensible platform. 🚀


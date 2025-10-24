/**
 * Tools Info Metadata
 * Contains information about all available tools for display in the tools info drawer
 */

export enum ToolCategory {
  Visualization = "visualization",
  WebSearch = "webSearch",
  CodeExecution = "codeExecution",
  Academic = "academic",
  Http = "http",
}

export interface ToolInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  icon: string;
  demoVideoUrl?: string;
  keywords: string[];
  usage: string;
}

export const TOOLS_INFO_DATA: ToolInfo[] = [
  // ============================================
  // VISUALIZATION TOOLS
  // ============================================
  {
    id: "createPieChart",
    name: "createPieChart",
    displayName: "Pie Chart",
    description: "Create interactive pie charts to visualize proportional data distribution",
    category: ToolCategory.Visualization,
    icon: "📊",
    demoVideoUrl: "", // User will add demo video URL
    keywords: ["pie", "chart", "visualization", "data", "proportion", "percentage"],
    usage: "Ask the AI to create a pie chart with your data",
  },
  {
    id: "createBarChart",
    name: "createBarChart",
    displayName: "Bar Chart",
    description: "Generate bar charts for comparing values across categories",
    category: ToolCategory.Visualization,
    icon: "📊",
    demoVideoUrl: "",
    keywords: ["bar", "chart", "comparison", "data", "category", "visualization"],
    usage: "Request a bar chart to compare data across different categories",
  },
  {
    id: "createLineChart",
    name: "createLineChart",
    displayName: "Line Chart",
    description: "Create line charts to show trends over time or continuous data",
    category: ToolCategory.Visualization,
    icon: "📈",
    demoVideoUrl: "",
    keywords: ["line", "chart", "trend", "time", "data", "visualization"],
    usage: "Ask for a line chart to visualize trends and patterns",
  },
  {
    id: "createTable",
    name: "createTable",
    displayName: "Data Table",
    description: "Display structured data in organized, sortable tables",
    category: ToolCategory.Visualization,
    icon: "📋",
    demoVideoUrl: "",
    keywords: ["table", "data", "structured", "organize", "display", "sort"],
    usage: "Request a table to organize and view structured data",
  },
  {
    id: "createFlashcards",
    name: "createFlashcards",
    displayName: "Flashcards",
    description: "Generate interactive flashcards for studying and memorization",
    category: ToolCategory.Visualization,
    icon: "🃏",
    demoVideoUrl: "",
    keywords: ["flashcard", "study", "learning", "memorization", "review", "education"],
    usage: "Ask the AI to create flashcards for studying key concepts",
  },
  {
    id: "createQuiz",
    name: "createQuiz",
    displayName: "Quiz",
    description: "Create interactive quizzes to test knowledge and understanding",
    category: ToolCategory.Visualization,
    icon: "❓",
    demoVideoUrl: "",
    keywords: ["quiz", "test", "assessment", "learning", "knowledge", "education"],
    usage: "Request a quiz to test your understanding of a topic",
  },
  {
    id: "createExam",
    name: "createExam",
    displayName: "Exam",
    description: "Generate comprehensive exams with multiple question types and scoring",
    category: ToolCategory.Visualization,
    icon: "✏️",
    demoVideoUrl: "",
    keywords: ["exam", "test", "assessment", "evaluation", "comprehensive", "education"],
    usage: "Ask for an exam to assess comprehensive knowledge",
  },
  {
    id: "createAssignment",
    name: "createAssignment",
    displayName: "Assignment",
    description: "Create assignments with instructions and submission requirements",
    category: ToolCategory.Visualization,
    icon: "📝",
    demoVideoUrl: "",
    keywords: ["assignment", "homework", "task", "project", "education", "submission"],
    usage: "Request an assignment to practice skills",
  },
  {
    id: "createCourseMaterial",
    name: "createCourseMaterial",
    displayName: "Course Material",
    description: "Generate structured course materials, lessons, and educational content",
    category: ToolCategory.Visualization,
    icon: "📚",
    demoVideoUrl: "",
    keywords: ["course", "material", "lesson", "content", "education", "learning"],
    usage: "Ask for course materials to learn a new topic",
  },
  {
    id: "createSchedule",
    name: "createSchedule",
    displayName: "Schedule",
    description: "Create visual schedules and timelines for events and classes",
    category: ToolCategory.Visualization,
    icon: "📅",
    demoVideoUrl: "",
    keywords: ["schedule", "calendar", "timeline", "event", "time", "organization"],
    usage: "Request a schedule to organize your classes and events",
  },
  {
    id: "createCourseList",
    name: "createCourseList",
    displayName: "Course List",
    description: "Display your enrolled courses with details and status",
    category: ToolCategory.Visualization,
    icon: "📖",
    demoVideoUrl: "",
    keywords: ["course", "list", "enrollment", "class", "curriculum", "education"],
    usage: "Ask to view your enrolled courses",
  },
  {
    id: "createAssignmentList",
    name: "createAssignmentList",
    displayName: "Assignment List",
    description: "Show all your assignments with due dates and status",
    category: ToolCategory.Visualization,
    icon: "✅",
    demoVideoUrl: "",
    keywords: ["assignment", "list", "task", "deadline", "due", "pending"],
    usage: "Request a list of all your assignments",
  },

  // ============================================
  // WEB SEARCH TOOLS
  // ============================================
  {
    id: "webSearch",
    name: "webSearch",
    displayName: "Web Search",
    description: "Search the internet for current information and recent data",
    category: ToolCategory.WebSearch,
    icon: "🔍",
    demoVideoUrl: "",
    keywords: ["search", "web", "internet", "information", "research", "current"],
    usage: "Ask the AI to search the web for information",
  },
  {
    id: "webContent",
    name: "webContent",
    displayName: "Web Content Extractor",
    description: "Extract and summarize content from websites",
    category: ToolCategory.WebSearch,
    icon: "📄",
    demoVideoUrl: "",
    keywords: ["content", "web", "extract", "summarize", "article", "website"],
    usage: "Request the AI to extract content from specific websites",
  },

  // ============================================
  // CODE EXECUTION TOOLS
  // ============================================
  {
    id: "javascriptExecution",
    name: "mini-javascript-execution",
    displayName: "JavaScript Execution",
    description: "Execute JavaScript code and visualize results in real-time",
    category: ToolCategory.CodeExecution,
    icon: "⚙️",
    demoVideoUrl: "",
    keywords: ["javascript", "code", "execute", "run", "js", "programming"],
    usage: "Ask the AI to execute JavaScript code",
  },
  {
    id: "pythonExecution",
    name: "python-execution",
    displayName: "Python Execution",
    description: "Run Python code for data analysis, calculations, and automation",
    category: ToolCategory.CodeExecution,
    icon: "🐍",
    demoVideoUrl: "",
    keywords: ["python", "code", "execute", "run", "data", "analysis"],
    usage: "Request Python code execution for analysis and calculation",
  },

  // ============================================
  // HTTP TOOLS
  // ============================================
  {
    id: "httpFetch",
    name: "http",
    displayName: "HTTP Fetch",
    description: "Make HTTP requests to APIs and retrieve data",
    category: ToolCategory.Http,
    icon: "🌐",
    demoVideoUrl: "",
    keywords: ["http", "fetch", "api", "request", "data", "integration"],
    usage: "Ask the AI to fetch data from APIs",
  },

  // ============================================
  // ACADEMIC TOOLS
  // ============================================
  {
    id: "courseMaterials",
    name: "get-course-materials",
    displayName: "Get Course Materials",
    description: "Retrieve course materials including lectures, readings, and resources",
    category: ToolCategory.Academic,
    icon: "📚",
    demoVideoUrl: "",
    keywords: ["course", "material", "lecture", "reading", "resource", "academic"],
    usage: "Ask for course materials from your enrolled courses",
  },
  {
    id: "upcomingAssignments",
    name: "get-upcoming-assignments",
    displayName: "Get Upcoming Assignments",
    description: "View all upcoming assignments with due dates and requirements",
    category: ToolCategory.Academic,
    icon: "📋",
    demoVideoUrl: "",
    keywords: ["assignment", "upcoming", "deadline", "due", "task", "academic"],
    usage: "Request a list of upcoming assignments and deadlines",
  },
  {
    id: "academicSchedule",
    name: "get-academic-schedule",
    displayName: "Get Academic Schedule",
    description: "View your class schedule and academic calendar",
    category: ToolCategory.Academic,
    icon: "📅",
    demoVideoUrl: "",
    keywords: ["schedule", "academic", "class", "timetable", "calendar", "course"],
    usage: "Ask for your academic schedule and class times",
  },
  {
    id: "findFaculty",
    name: "find-faculty",
    displayName: "Find Faculty",
    description: "Search for faculty members and their contact information",
    category: ToolCategory.Academic,
    icon: "👨‍🏫",
    demoVideoUrl: "",
    keywords: ["faculty", "professor", "instructor", "contact", "teacher", "staff"],
    usage: "Search for faculty members by name or department",
  },
];

// Helper function to get tools by category
export function getToolsByCategory(category: ToolCategory): ToolInfo[] {
  return TOOLS_INFO_DATA.filter((tool) => tool.category === category);
}

// Helper function to search tools
export function searchTools(query: string): ToolInfo[] {
  const lowerQuery = query.toLowerCase();
  return TOOLS_INFO_DATA.filter(
    (tool) =>
      tool.displayName.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery)),
  );
}

// Get all unique categories
export const TOOL_CATEGORIES = [
  ToolCategory.Visualization,
  ToolCategory.WebSearch,
  ToolCategory.CodeExecution,
  ToolCategory.Academic,
  ToolCategory.Http,
] as const;

// Category display names
export const CATEGORY_DISPLAY_NAMES: Record<ToolCategory, string> = {
  [ToolCategory.Visualization]: "Visualization",
  [ToolCategory.WebSearch]: "Web Search",
  [ToolCategory.CodeExecution]: "Code Execution",
  [ToolCategory.Academic]: "Academic",
  [ToolCategory.Http]: "HTTP",
};

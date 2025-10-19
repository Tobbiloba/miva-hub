export enum AppDefaultToolkit {
  Visualization = "visualization",
  WebSearch = "webSearch",
  Http = "http",
  Code = "code",
  Academic = "academic",
}

export enum DefaultToolName {
  CreatePieChart = "createPieChart",
  CreateBarChart = "createBarChart",
  CreateLineChart = "createLineChart",
  CreateTable = "createTable",
  CreateFlashcards = "createFlashcards",
  CreateQuiz = "createQuiz",
  CreateExam = "createExam",
  CreateAssignment = "createAssignment",
  CreateCourseMaterial = "createCourseMaterial",
  CreateSchedule = "createSchedule",
  CreateCourseList = "createCourseList",
  CreateAssignmentList = "createAssignmentList",
  WebSearch = "webSearch",
  WebContent = "webContent",
  Http = "http",
  JavascriptExecution = "mini-javascript-execution",
  PythonExecution = "python-execution",
  // Academic Tools
  CourseMaterials = "get-course-materials",
  UpcomingAssignments = "get-upcoming-assignments", 
  FindFaculty = "find-faculty",
  AcademicSchedule = "get-academic-schedule",
}

export const SequentialThinkingToolName = "sequential-thinking";

// Academic tools not exported to prevent client-side bundling
// Use dynamic imports in server-side code: const { academicTools } = await import('./academic')

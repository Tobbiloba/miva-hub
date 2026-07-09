import { Tool } from "ai";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { jsExecutionTool } from "./code/js-run-tool";
import { pythonExecutionTool } from "./code/python-run-tool";
import { httpFetchTool } from "./http/fetch";
import { createAssignmentTool } from "./visualization/create-assignment";
import { createAssignmentListTool } from "./visualization/create-assignment-list";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createCourseListTool } from "./visualization/create-course-list";
import { createCourseMaterialTool } from "./visualization/create-course-material";
import { createExamTool } from "./visualization/create-exam";
import { createFlashcardsTool } from "./visualization/create-flashcards";
import { createLineChartTool } from "./visualization/create-line-chart";
import { createPieChartTool } from "./visualization/create-pie-chart";
import { createQuizTool } from "./visualization/create-quiz";
import { createScheduleTool } from "./visualization/create-schedule";
import { createTableTool } from "./visualization/create-table";
import { exaContentsTool, exaSearchTool } from "./web/web-search";
// Academic tools imported dynamically to avoid client-side bundling

/**
 * Dynamically loads academic tools server-side only
 * This prevents client-side PostgreSQL bundling issues
 */
async function loadAcademicTools(): Promise<Record<string, Tool>> {
  try {
    if (typeof window !== "undefined") {
      // Client-side: return empty object to prevent bundling issues
      return {};
    }

    // Server-side: dynamically import academic tools
    const { academicTools } = await import("./academic/index");
    return academicTools;
  } catch (error) {
    console.warn("[Academic Tools] Failed to load academic tools:", error);
    return {};
  }
}

export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Record<string, Tool>
> = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
    [DefaultToolName.CreateTable]: createTableTool,
    [DefaultToolName.CreateFlashcards]: createFlashcardsTool,
    [DefaultToolName.CreateQuiz]: createQuizTool,
    [DefaultToolName.CreateExam]: createExamTool,
    [DefaultToolName.CreateAssignment]: createAssignmentTool,
    [DefaultToolName.CreateCourseMaterial]: createCourseMaterialTool,
    [DefaultToolName.CreateSchedule]: createScheduleTool,
    [DefaultToolName.CreateCourseList]: createCourseListTool,
    [DefaultToolName.CreateAssignmentList]: createAssignmentListTool,
  },
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: exaSearchTool,
    [DefaultToolName.WebContent]: exaContentsTool,
  },
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
  [AppDefaultToolkit.Code]: {
    [DefaultToolName.JavascriptExecution]: jsExecutionTool,
    [DefaultToolName.PythonExecution]: pythonExecutionTool,
  },
  [AppDefaultToolkit.Academic]: {
    // Academic tools loaded dynamically on server-side only
  },
};

/**
 * Loads all default tools including dynamic academic tools (server-side only)
 * Use this instead of APP_DEFAULT_TOOL_KIT when academic tools are needed
 */
export async function loadAppDefaultToolKitWithAcademic(): Promise<
  Record<AppDefaultToolkit, Record<string, Tool>>
> {
  const academicTools = await loadAcademicTools();

  return {
    ...APP_DEFAULT_TOOL_KIT,
    [AppDefaultToolkit.Academic]: academicTools,
  };
}

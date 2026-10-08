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
import type { AcademicToolUser } from "./academic/index";

/**
 * Academic tools for one signed-in student (server-side only — dynamic import
 * keeps the DB client out of client bundles).
 */
async function loadAcademicTools(
  user: AcademicToolUser,
): Promise<Record<string, Tool>> {
  if (typeof window !== "undefined") return {};
  const { createAcademicTools } = await import("./academic/index");
  return createAcademicTools(user);
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
 * Default tools plus the academic tools bound to `user` (server-side only).
 */
export async function loadAppDefaultToolKitWithAcademic(
  user: AcademicToolUser,
): Promise<Record<AppDefaultToolkit, Record<string, Tool>>> {
  return {
    ...APP_DEFAULT_TOOL_KIT,
    [AppDefaultToolkit.Academic]: await loadAcademicTools(user),
  };
}

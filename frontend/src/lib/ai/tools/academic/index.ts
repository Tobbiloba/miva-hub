/**
 * Academic Tools Bundle
 * Built-in tools over Askly's own academic data. Created per request and
 * bound to the signed-in student, so no tool ever takes a user id from the
 * model.
 */

import type { Tool } from "ai";
import { createAcademicScheduleTool } from "./academic-schedule.tool";
import { createAssignmentTrackerTool } from "./assignment-tracker.tool";
import { createCourseContentTool } from "./course-content.tool";
import { createFacultyDirectoryTool } from "./faculty-directory.tool";
import { createManageDeadlinesTool } from "./manage-deadlines.tool";
import { createMyActivityTool } from "./my-activity.tool";
import { createMyCoursesTool } from "./my-courses.tool";
import { createSearchMaterialsTool } from "./search-materials.tool";

export interface AcademicToolUser {
  userId: string;
  universityId: string;
}

export function createAcademicTools(
  user: AcademicToolUser,
): Record<string, Tool> {
  return {
    "get-my-courses": createMyCoursesTool(user.userId),
    "get-course-materials": createCourseContentTool(user.userId),
    "search-course-materials": createSearchMaterialsTool(user.userId),
    "get-upcoming-assignments": createAssignmentTrackerTool(user.userId),
    "manage-deadlines": createManageDeadlinesTool(user.userId),
    "get-my-activity": createMyActivityTool(user.userId),
    "find-faculty": createFacultyDirectoryTool(user.universityId),
    "get-academic-schedule": createAcademicScheduleTool(user.userId),
  };
}

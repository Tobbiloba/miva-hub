import { tool } from "ai";
import { z } from "zod";

export const createAssignmentTool = tool({
  description: "Create an interactive assignment preview with expandable sections and submission interface",
  inputSchema: z.object({
    assignment_id: z.string().optional(),
    course_code: z.string(),
    course_name: z.string(),
    title: z.string().describe("Title of the assignment"),
    description: z.string().describe("Brief description of the assignment"),
    due_date: z.string().describe("Due date of the assignment"),
    total_points: z.number().describe("Total points available"),
    submission_type: z.enum(["file", "text", "link", "multiple"]).optional(),
    status: z.enum(["not_started", "in_progress", "submitted", "graded"]).optional(),
    instructions: z.string().optional().describe("Detailed instructions for the assignment"),
    rubric: z.array(z.object({
      criteria: z.string().describe("Grading criteria name"),
      points: z.number().describe("Points for this criteria"),
      description: z.string().describe("Description of what's expected"),
    })).optional(),
    resources: z.array(z.object({
      type: z.string().describe("Type of resource (PDF, link, video, etc.)"),
      title: z.string().describe("Resource title"),
      url: z.string().describe("Resource URL"),
    })).optional(),
  }),
  execute: async () => "Success",
});

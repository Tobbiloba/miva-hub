import { tool } from "ai";
import { z } from "zod";

export const createCourseListTool = tool({
  description: "Display student's enrolled courses in a grid layout with summary statistics",
  inputSchema: z.object({
    student_id: z.string().optional(),
    semester: z.string().optional(),
    total_courses: z.number().optional(),
    total_credits: z.number().optional(),
    courses: z.array(z.object({
      course_code: z.string(),
      course_name: z.string(),
      credits: z.number(),
      instructor: z.string().optional(),
      status: z.string().optional().describe("e.g., enrolled, completed, dropped"),
      enrollment_date: z.string().optional(),
      grade: z.string().optional(),
    })),
  }),
  execute: async () => "Success",
});

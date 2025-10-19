import { tool } from "ai";
import { z } from "zod";

export const createAssignmentListTool = tool({
  description: "Display upcoming assignments with due dates, urgency indicators, and details",
  inputSchema: z.object({
    student_id: z.string().optional(),
    total_count: z.number().optional(),
    assignments: z.array(z.object({
      assignment_id: z.string().optional(),
      title: z.string(),
      course_code: z.string(),
      course_name: z.string(),
      due_date: z.string(),
      due_time: z.string().optional(),
      points_possible: z.number().optional(),
      assignment_type: z.string().optional().describe("e.g., essay, quiz, project"),
      urgency: z.enum(["urgent", "soon", "later"]).optional(),
      days_until_due: z.number().optional(),
      description: z.string().optional(),
      status: z.string().optional().describe("e.g., not_started, in_progress, submitted"),
    })),
  }),
  execute: async () => "Success",
});

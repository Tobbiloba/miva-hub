import { tool } from "ai";
import { z } from "zod";

export const createScheduleTool = tool({
  description: "Display academic schedule in a weekly calendar view",
  inputSchema: z.object({
    student_id: z.string().optional(),
    semester: z.string().optional(),
    week_number: z.number().optional(),
    schedule_type: z.enum(["weekly", "daily"]).optional(),
    days: z.array(z.object({
      day: z.string().describe("Day of week (e.g., Monday, Tuesday)"),
      classes: z.array(z.object({
        time: z.string().describe("Class time (e.g., 9:00 AM - 10:30 AM)"),
        course_code: z.string(),
        course_name: z.string(),
        location: z.string().optional(),
        instructor: z.string().optional(),
        class_type: z.string().optional().describe("e.g., Lecture, Lab, Tutorial"),
      })),
    })),
  }),
  execute: async () => "Success",
});

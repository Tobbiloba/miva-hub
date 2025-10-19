import { tool } from "ai";
import { z } from "zod";

export const createExamTool = tool({
  description: "Create an interactive exam interface with timer, question navigator, and auto-submit",
  inputSchema: z.object({
    exam_id: z.string().optional(),
    course_code: z.string(),
    course_name: z.string(),
    exam_type: z.enum(["midterm", "final", "quiz", "practice"]).optional(),
    time_limit_minutes: z.number().describe("Time limit in minutes"),
    total_questions: z.number().describe("Total number of questions"),
    total_points: z.number().describe("Total points available"),
    instructions: z.string().optional(),
    questions: z.array(z.object({
      question: z.string().describe("The question text"),
      question_type: z.enum(["multiple_choice", "true_false", "short_answer", "essay"]).describe("Type of question"),
      options: z.array(z.string()).optional().describe("Answer options for multiple choice questions"),
      points: z.number().describe("Points for this question"),
      correct_answer: z.string().optional().describe("The correct answer (for grading)"),
    })),
    grading_rubric: z.string().optional(),
    student_id: z.string().optional(),
  }),
  execute: async () => "Success",
});

import { tool } from "ai";
import { z } from "zod";

export const createQuizTool = tool({
  description: "Create an interactive quiz interface with multiple question types and progress tracking",
  inputSchema: z.object({
    quiz_id: z.string().optional(),
    title: z.string().describe("Title of the quiz"),
    course_name: z.string().optional(),
    course_code: z.string().optional(),
    total_questions: z.number().describe("Total number of questions"),
    total_points: z.number().describe("Total points available"),
    estimated_time: z.string().optional().describe("Estimated time to complete (e.g., '30 minutes')"),
    instructions: z.string().optional(),
    questions: z.array(z.object({
      question: z.string().describe("The question text"),
      question_type: z.enum(["multiple_choice", "true_false", "short_answer"]).describe("Type of question"),
      options: z.array(z.string()).optional().describe("Answer options for multiple choice questions"),
      points: z.number().describe("Points for this question"),
      correct_answer: z.string().optional().describe("The correct answer (for grading)"),
    })),
  }),
  execute: async () => "Success",
});

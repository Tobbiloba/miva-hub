import { tool } from "ai";
import { z } from "zod";

export const createCourseMaterialTool = tool({
  description: "Display course materials (PDF, video, audio, documents) with AI summary and key concepts",
  inputSchema: z.object({
    material_id: z.string().optional(),
    title: z.string().describe("Title of the material"),
    file_url: z.string().describe("URL to the file (S3 or direct URL)"),
    material_type: z.enum(["resource", "assignment", "lecture", "quiz", "video", "audio"]).optional(),
    week_number: z.number().optional(),
    course_code: z.string().optional(),
    course_name: z.string().optional(),
    ai_summary: z.string().optional().describe("AI-generated summary of the content"),
    key_concepts: z.array(z.string()).optional().describe("Key concepts covered in the material"),
    description: z.string().optional(),
    upload_date: z.string().optional(),
  }),
  execute: async () => "Success",
});

import { tool } from "ai";
import { z } from "zod";

export const createFlashcardsTool = tool({
  description: "Create an interactive flashcard study interface with flip animations",
  inputSchema: z.object({
    flashcards_id: z.string().optional(),
    topic: z.string().describe("The topic or subject of the flashcards"),
    course_name: z.string().optional(),
    course_code: z.string().optional(),
    total_cards: z.number().describe("Total number of flashcards"),
    difficulty_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    cards: z.array(z.object({
      front: z.string().describe("Front side of the flashcard (question/term)"),
      back: z.string().describe("Back side of the flashcard (answer/definition)"),
    })),
    sources_used: z.array(z.string()).optional().describe("Sources referenced for creating flashcards"),
  }),
  execute: async () => "Success",
});

/**
 * MCP Server Configuration
 *
 * This file handles the configuration of the MCP (Model Context Protocol) server URL
 * based on the environment (local development vs production).
 */

export const getMCPServerURL = (): string => {
  // Check if MCP_SERVER_URL is explicitly set
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL;
  }

  // Legacy name; prefer the server-only MCP_SERVER_URL.
  if (process.env.NEXT_PUBLIC_MCP_SERVER_URL) {
    return process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[mcp-config] MCP_SERVER_URL is not set; falling back to localhost. MCP tools will be unavailable.",
    );
  }
  // Default to localhost for development (MCP server runs on port 8080)
  return "http://localhost:8080/sse";
};

/**
 * Build default headers for MCP server requests.
 * Includes X-MCP-Secret when MCP_SHARED_SECRET is set.
 */
const getMCPHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const secret = process.env.MCP_SHARED_SECRET;
  if (secret) {
    headers["X-MCP-Secret"] = secret;
  }
  return headers;
};

export const MCP_CONFIG = {
  SERVER_URL: getMCPServerURL(),
  DEFAULT_SERVER_NAME: "miva-academic",
  HEADERS: getMCPHeaders(),
} as const;

/**
 * Environment-specific MCP server URLs:
 *
 * Local Development:
 *   (unset) -> http://localhost:8080/sse
 *
 * Production (server-only; NEXT_PUBLIC_MCP_SERVER_URL is still honoured as a
 * legacy fallback):
 *   MCP_SERVER_URL=https://your-mcp-server-domain.com/sse
 *   MCP_SHARED_SECRET=<same value as the MCP server's MCP_SHARED_SECRET>
 */

/**
 * MCP tools the student chat exposes. The academic server's other tools are
 * either duplicates of the app's own session-bound academic tools
 * (list_enrolled_courses, get_course_materials, get_upcoming_assignments,
 * get_academic_schedule) or depend on the Study Buddy service, which can't
 * serve them yet (ask_study_question, generate_study_guide, create_flashcards,
 * generate_quiz, explain_concept_deeply, generate_exam_simulator,
 * submit_exam_answers, convert_notes_to_flashcards, export_flashcards), and
 * summarize_material needs AI summaries that mostly don't exist. Offering
 * them made the model pick broken tools over working ones. Re-add a tool
 * here once it works end to end.
 */
export const STUDENT_MCP_TOOLS: ReadonlySet<string> = new Set([
  "get_my_progress",
]);

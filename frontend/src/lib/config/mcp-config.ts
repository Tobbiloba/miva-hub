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

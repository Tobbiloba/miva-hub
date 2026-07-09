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

  // Default to localhost for development (MCP server runs on port 8080)
  return process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:8080/sse";
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
 *   NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8080/sse
 *   (or set MCP_SERVER_URL for server-side usage)
 *
 * Production:
 *   NEXT_PUBLIC_MCP_SERVER_URL=https://your-mcp-server-domain.com/sse
 *
 * Example:
 *   NEXT_PUBLIC_MCP_SERVER_URL=https://miva-hub-mcp-production.up.railway.app/sse
 */

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

  // Default to localhost for development
  return "http://localhost:3001/sse";
};

export const MCP_CONFIG = {
  SERVER_URL: getMCPServerURL(),
  DEFAULT_SERVER_NAME: "miva-academic",
} as const;

/**
 * Environment-specific MCP server URLs:
 * 
 * Local Development:
 *   MCP_SERVER_URL=http://localhost:3001/sse
 * 
 * Production (Railway):
 *   MCP_SERVER_URL=https://miva-hub-production-3979.up.railway.app/sse
 * 
 * Production (Vercel):
 *   MCP_SERVER_URL=https://your-production-domain.com/sse
 */

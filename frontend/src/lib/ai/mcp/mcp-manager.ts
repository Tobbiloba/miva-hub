import { createDbBasedMCPConfigsStorage } from "./db-mcp-config-storage";
import { createFileBasedMCPConfigsStorage } from "./fb-mcp-config-storage";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "./create-mcp-clients-manager";
import { FILE_BASED_MCP_CONFIG } from "lib/const";
import { MCP_CONFIG } from "lib/config/mcp-config";
declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager;
}

if (!globalThis.__mcpClientsManager__) {
  // Choose the appropriate storage implementation based on environment
  const storage = FILE_BASED_MCP_CONFIG
    ? createFileBasedMCPConfigsStorage()
    : createDbBasedMCPConfigsStorage();
  globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
}

export const initMCPManager = async () => {
  // Ensure default MCP server exists in database before initializing
  await ensureDefaultMCPServer();
  return globalThis.__mcpClientsManager__.init();
};

async function ensureDefaultMCPServer() {
  try {
    const { mcpRepository } = await import("lib/db/repository");
    const { generateUUID } = await import("lib/utils");
    
    const serverName = MCP_CONFIG.DEFAULT_SERVER_NAME;
    const serverConfig = {
      url: MCP_CONFIG.SERVER_URL,
    };

    // Clean up old server name if it exists
    const oldServer = await mcpRepository.selectByServerName("my-local-mcp");
    if (oldServer) {
      await mcpRepository.deleteById(oldServer.id);
    }

    // Check if server already exists
    const existingServer = await mcpRepository.selectByServerName(serverName);
    
    if (!existingServer) {
      // Create the default MCP server
      await mcpRepository.save({
        id: generateUUID(),
        name: serverName,
        config: serverConfig,
      });
      console.log("✅ MIVA Academic MCP server initialized");
    }
  } catch (error) {
    console.warn("⚠️ Failed to ensure default MCP server:", error);
    // Don't throw - allow app to continue even if MCP init fails
  }
}

export const mcpClientsManager = globalThis.__mcpClientsManager__;

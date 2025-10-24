import { NextResponse } from "next/server";
import { mcpRepository } from "lib/db/repository";
import { generateUUID } from "lib/utils";
import { MCPServerConfig } from "app-types/mcp";
import { MCP_CONFIG } from "lib/config/mcp-config";

// This endpoint ensures the default MCP server exists in the database
export async function POST() {
  try {
    // Default MCP server configuration
    const serverName = MCP_CONFIG.DEFAULT_SERVER_NAME;
    const serverConfig: MCPServerConfig = {
      url: MCP_CONFIG.SERVER_URL,
      // Add any other required configuration here
    };

    // Clean up old server name if it exists
    const oldServer = await mcpRepository.selectByServerName("my-local-mcp");
    if (oldServer) {
      await mcpRepository.deleteById(oldServer.id);
    }

    // Check if the MCP server already exists
    const existingServer = await mcpRepository.selectByServerName(serverName);
    
    if (existingServer) {
      // Update the existing server to ensure config is correct
      await mcpRepository.save({
        id: existingServer.id,
        name: existingServer.name,
        config: serverConfig
      });
      
      return NextResponse.json({ 
        success: true, 
        status: "updated", 
        server: {
          id: existingServer.id,
          name: existingServer.name
        }
      });
    } else {
      // Create the default MCP server if it doesn't exist
      const newServer = await mcpRepository.save({
        id: generateUUID(),
        name: serverName,
        config: serverConfig
      });
      
      return NextResponse.json({ 
        success: true, 
        status: "created", 
        server: {
          id: newServer.id,
          name: newServer.name
        }
      });
    }
  } catch (error) {
    console.error("Failed to create default MCP server:", error);
    return NextResponse.json(
      { error: "Failed to create default MCP server" },
      { status: 500 }
    );
  }
}
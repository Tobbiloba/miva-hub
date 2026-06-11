import { pgAgentRepository } from "./pg/repositories/agent-repository.pg";
import { pgBookmarkRepository } from "./pg/repositories/bookmark-repository.pg";
import { pgChatRepository } from "./pg/repositories/chat-repository.pg";
import { pgMcpOAuthRepository } from "./pg/repositories/mcp-oauth-repository.pg";
import { pgMcpRepository } from "./pg/repositories/mcp-repository.pg";
import { pgMcpServerCustomizationRepository } from "./pg/repositories/mcp-server-customization-repository.pg";
import { pgMcpMcpToolCustomizationRepository } from "./pg/repositories/mcp-tool-customization-repository.pg";
import { pgUniversityRepository } from "./pg/repositories/university-repository.pg";
import { pgUserRepository } from "./pg/repositories/user-repository.pg";

export const chatRepository = pgChatRepository;
export const userRepository = pgUserRepository;
export const mcpRepository = pgMcpRepository;
export const mcpMcpToolCustomizationRepository =
  pgMcpMcpToolCustomizationRepository;
export const mcpServerCustomizationRepository =
  pgMcpServerCustomizationRepository;
export const mcpOAuthRepository = pgMcpOAuthRepository;

export const agentRepository = pgAgentRepository;
export const bookmarkRepository = pgBookmarkRepository;
export const universityRepository = pgUniversityRepository;

"use server";
import { auth } from "auth/server";
import { checkIsSuperAdmin, isSuperAdmin } from "lib/auth/admin";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { MCP_CONFIG } from "lib/config/mcp-config";
import { getUserAcademicContext } from "lib/user/user-context";
import { headers } from "next/headers";
import { z } from "zod";

import { McpServerSchema } from "lib/db/pg/schema.pg";
import { mcpOAuthRepository, mcpRepository } from "lib/db/repository";

// Server actions are public HTTP endpoints: every one must authorize itself.
// MCP servers are platform-global, so managing them is super_admin only.

async function requireSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

async function requireSuperAdminUser() {
  const user = await requireSessionUser();
  if (!isSuperAdmin(user) && !(await checkIsSuperAdmin(user.id))) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function selectMcpClientsAction() {
  await requireSuperAdminUser();
  const list = await mcpClientsManager.getClients();
  return list.map(({ client, id }) => {
    return {
      ...client.getInfo(),
      id,
    };
  });
}

export async function selectMcpClientAction(id: string) {
  await requireSuperAdminUser();
  const client = await mcpClientsManager.getClient(id);
  if (!client) {
    throw new Error("Client not found");
  }
  return {
    ...client.client.getInfo(),
    id,
  };
}

export async function saveMcpClientAction(
  server: typeof McpServerSchema.$inferInsert,
) {
  await requireSuperAdminUser();
  if (process.env.NOT_ALLOW_ADD_MCP_SERVERS) {
    throw new Error("Not allowed to add MCP servers");
  }
  // Validate name to ensure it only contains alphanumeric characters and hyphens
  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message:
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
  });

  const result = nameSchema.safeParse(server.name);
  if (!result.success) {
    throw new Error(
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
    );
  }

  return mcpClientsManager.persistClient(server);
}

export async function existMcpClientByServerNameAction(serverName: string) {
  await requireSuperAdminUser();
  return await mcpRepository.existsByServerName(serverName);
}

export async function removeMcpClientAction(id: string) {
  await requireSuperAdminUser();
  await mcpClientsManager.removeClient(id);
}

export async function refreshMcpClientAction(id: string) {
  await requireSuperAdminUser();
  await mcpClientsManager.refreshClient(id);
}

export async function authorizeMcpClientAction(id: string) {
  await refreshMcpClientAction(id);
  const client = await mcpClientsManager.getClient(id);
  if (client?.client.status != "authorizing") {
    throw new Error("Not Authorizing");
  }
  return client.client.getAuthorizationUrl()?.toString();
}

export async function checkTokenMcpClientAction(id: string) {
  await requireSuperAdminUser();
  const session = await mcpOAuthRepository.getAuthenticatedSession(id);

  // for wait connect to mcp server
  await mcpClientsManager.getClient(id).catch(() => null);

  return !!session?.tokens;
}

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input: unknown,
) {
  await requireSuperAdminUser();
  return mcpClientsManager.toolCall(id, toolName, input);
}

/**
 * Student-facing tool call (content renderer, voice chat). Only the default
 * academic server is reachable, and the student identity always comes from the
 * session — never from `input`.
 */
export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input: unknown,
) {
  const user = await requireSessionUser();
  if (serverName !== MCP_CONFIG.DEFAULT_SERVER_NAME) {
    await requireSuperAdminUser();
  }
  const userContext = await getUserAcademicContext(user.email);
  return mcpClientsManager.toolCallByServerName(
    serverName,
    toolName,
    input,
    userContext,
  );
}

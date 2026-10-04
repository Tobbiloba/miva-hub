import "server-only";

import { McpServerCustomizationsPrompt } from "app-types/mcp";
import { Agent } from "app-types/agent";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import {
  agentRepository,
  mcpMcpToolCustomizationRepository,
  mcpServerCustomizationRepository,
} from "lib/db/repository";

// Server-only helpers for the chat routes. These take a userId, so they must
// never live in a "use server" module (that would expose them as endpoints).

export async function rememberMcpServerCustomizationsAction(userId: string) {
  const key = CacheKeys.mcpServerCustomizations(userId);

  const cachedMcpServerCustomizations =
    await serverCache.get<Record<string, McpServerCustomizationsPrompt>>(key);
  if (cachedMcpServerCustomizations) {
    return cachedMcpServerCustomizations;
  }

  const mcpServerCustomizations =
    await mcpServerCustomizationRepository.selectByUserId(userId);
  const mcpToolCustomizations =
    await mcpMcpToolCustomizationRepository.selectByUserId(userId);

  const serverIds: string[] = [
    ...mcpServerCustomizations.map(
      (mcpServerCustomization) => mcpServerCustomization.mcpServerId,
    ),
    ...mcpToolCustomizations.map(
      (mcpToolCustomization) => mcpToolCustomization.mcpServerId,
    ),
  ];

  const prompts = Array.from(new Set(serverIds)).reduce(
    (acc, serverId) => {
      const sc = mcpServerCustomizations.find((v) => v.mcpServerId == serverId);
      const tc = mcpToolCustomizations.filter(
        (mcpToolCustomization) => mcpToolCustomization.mcpServerId === serverId,
      );
      const data: McpServerCustomizationsPrompt = {
        name: sc?.serverName || tc[0]?.serverName || "",
        id: serverId,
        prompt: sc?.prompt || "",
        tools: tc.reduce(
          (acc, v) => {
            acc[v.toolName] = v.prompt || "";
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      acc[serverId] = data;
      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );

  serverCache.set(key, prompts, 1000 * 60 * 30); // 30 minutes
  return prompts;
}

/**
 * The agent the user mentioned, if they may use it. Not cached: the result
 * depends on the caller (owner / same-university visibility), so a cache
 * keyed by agent id would hand one user's authorization to another.
 */
export async function rememberAgentAction(
  agent: string | undefined,
  userId: string,
) {
  if (!agent) return undefined;
  const result = await agentRepository.selectAgentById(agent, userId);
  return (result ?? undefined) as Agent | undefined;
}

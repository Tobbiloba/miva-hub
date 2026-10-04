import { MCPServerInfo } from "app-types/mcp";
import { auth } from "auth/server";
import { checkIsSuperAdmin, isSuperAdmin } from "lib/auth/admin";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Server configs carry credentials (e.g. X-MCP-Secret headers): only the
  // super_admin who manages them may see them.
  const canSeeConfig =
    isSuperAdmin(session.user) || (await checkIsSuperAdmin(session.user.id));

  const [servers, memoryClients] = await Promise.all([
    mcpRepository.selectAll(),
    mcpClientsManager.getClients(),
  ]);

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = servers.filter((server) => !memoryMap.has(server.id));

  const serverIds = new Set(servers.map((s) => s.id));
  const removeTargets = memoryClients.filter(({ id }) => !serverIds.has(id));

  if (addTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      addTargets.map((server) => mcpClientsManager.refreshClient(server.id)),
    );
  }
  if (removeTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      removeTargets.map((client) =>
        mcpClientsManager.disconnectClient(client.id),
      ),
    );
  }

  const result = servers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const mcpInfo: MCPServerInfo & { id: string } = {
      id: server.id,
      name: server.name,
      config: canSeeConfig ? server.config : ({} as MCPServerInfo["config"]),
      status: info?.status ?? "loading",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
    };
    return mcpInfo;
  });

  return Response.json(result);
}

import { ToolCallOptions, jsonSchema } from "ai";
import {
  type MCPServerConfig,
  type McpServerInsert,
  type McpServerSelect,
  type VercelAIMcpTool,
  VercelAIMcpToolTag,
} from "app-types/mcp";
import { colorize } from "consola/utils";
import { MCP_CONFIG } from "lib/config/mcp-config";
import { McpServerSchema } from "lib/db/pg/schema.pg";
import {
  Locker,
  errorToString,
  generateUUID,
  safeJSONParse,
  toAny,
} from "lib/utils";
import globalLogger from "logger";
import { safe } from "ts-safe";
import { type MCPClient, createMCPClient } from "./create-mcp-client";
import { createMCPToolId } from "./mcp-tool-id";
import { createMemoryMCPConfigStorage } from "./memory-mcp-config-storage";

/**
 * Interface for storage of MCP server configurations.
 * Implementations should handle persistent storage of server configs.
 *
 * IMPORTANT: When implementing this interface, be aware that:
 * - Storage can be modified externally (e.g., file edited manually)
 * - Concurrent modifications may occur from multiple processes
 * - Implementations should either handle these scenarios or document limitations
 */
export interface MCPConfigStorage {
  init(manager: MCPClientsManager): Promise<void>;
  loadAll(): Promise<McpServerSelect[]>;
  save(server: McpServerInsert): Promise<McpServerSelect>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  get(id: string): Promise<McpServerSelect | null>;
}

export class MCPClientsManager {
  protected clients = new Map<
    string,
    {
      client: MCPClient;
      name: string;
    }
  >();
  private initializedLock = new Locker();
  private initialized = false;
  private logger = globalLogger.withDefaults({
    message: colorize("dim", `[${generateUUID().slice(0, 4)}] MCP Manager: `),
  });

  // Optional storage for persistent configurations
  constructor(
    private storage: MCPConfigStorage = createMemoryMCPConfigStorage(),
    private autoDisconnectSeconds: number = 60 * 30, // 30 minutes
  ) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
  }

  private async waitInitialized() {
    if (this.initialized) {
      return;
    }
    if (this.initializedLock.isLocked) {
      await this.initializedLock.wait();
      return;
    }
    await this.init();
  }

  async init() {
    this.logger.info("Initializing MCP clients manager");
    if (this.initializedLock.isLocked) {
      this.logger.info(
        "MCP clients manager already initialized, waiting for lock",
      );
      return this.initializedLock.wait();
    }
    if (this.initialized) {
      this.logger.info("MCP clients manager already initialized");
      return;
    }
    return safe(() => this.initializedLock.lock())
      .ifOk(async () => {
        if (this.storage) {
          await this.storage.init(this);
          const configs = await this.storage.loadAll();
          await Promise.all(
            configs.map(({ id, name, config }) =>
              this.addClient(id, name, config).catch(() => {
                `ignore error`;
              }),
            ),
          );
        }
      })
      .watch(() => {
        this.initializedLock.unlock();
        this.initialized = true;
      })
      .unwrap();
  }

  /**
   * Returns all tools from all clients as a flat object
   */
  async tools(): Promise<Record<string, VercelAIMcpTool>> {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).reduce(
      (acc, [id, client]) => {
        if (!client.client?.toolInfo?.length) return acc;
        const clientName = client.name;
        return {
          ...acc,
          ...client.client.toolInfo.reduce(
            (bcc, tool) => {
              return {
                ...bcc,
                [createMCPToolId(clientName, tool.name)]:
                  VercelAIMcpToolTag.create({
                    description: tool.description,
                    inputSchema: jsonSchema(
                      toAny({
                        ...tool.inputSchema,
                        properties: tool.inputSchema?.properties ?? {},
                        additionalProperties: false,
                      }),
                    ),
                    _originToolName: tool.name,
                    _mcpServerName: clientName,
                    _mcpServerId: id,
                    execute: (params, options: ToolCallOptions) => {
                      options?.abortSignal?.throwIfAborted();
                      return this.toolCall(id, tool.name, params);
                    },
                  }),
              };
            },
            {} as Record<string, VercelAIMcpTool>,
          ),
        };
      },
      {} as Record<string, VercelAIMcpTool>,
    );
  }
  /**
   * Creates and adds a new client instance to memory only (no storage persistence)
   */
  async addClient(id: string, name: string, serverConfig: MCPServerConfig) {
    if (this.clients.has(id)) {
      const prevClient = this.clients.get(id)!;
      void prevClient.client.disconnect();
    }
    // The built-in academic server is configured by env (URL + shared
    // secret), never by its stored row: the secret must not live in the DB,
    // and a changed MCP_SERVER_URL must take effect without a DB edit.
    const effectiveConfig: MCPServerConfig =
      name === MCP_CONFIG.DEFAULT_SERVER_NAME
        ? { url: MCP_CONFIG.SERVER_URL, headers: { ...MCP_CONFIG.HEADERS } }
        : serverConfig;
    const client = createMCPClient(id, name, effectiveConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
    });
    this.clients.set(id, { client, name });
    return client.connect();
  }

  /**
   * Persists a new client configuration to storage and adds the client instance to memory
   */
  async persistClient(server: typeof McpServerSchema.$inferInsert) {
    let id = server.name;
    if (this.storage) {
      const entity = await this.storage.save(server);
      id = entity.id;
    }
    await this.addClient(id, server.name, server.config).catch((err) => {
      if (!server.id) {
        void this.removeClient(id);
      }
      throw err;
    });

    return this.clients.get(id)!;
  }

  /**
   * Removes a client by name, disposing resources and removing from storage
   */
  async removeClient(id: string) {
    if (this.storage) {
      if (await this.storage.has(id)) {
        await this.storage.delete(id);
      }
    }
    this.disconnectClient(id);
  }

  async disconnectClient(id: string) {
    const client = this.clients.get(id);
    this.clients.delete(id);
    if (client) {
      void client.client.disconnect();
    }
  }

  /**
   * Refreshes an existing client with a new configuration or its existing config
   */
  async refreshClient(id: string) {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }
    this.logger.info(`Refreshing client ${server.name}`);
    await this.addClient(id, server.name, server.config);
    return this.clients.get(id)!;
  }

  async cleanup() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  async getClients() {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).map(([id, { client }]) => ({
      id,
      client: client,
    }));
  }
  async getClient(id: string) {
    await this.waitInitialized();
    const client = this.clients.get(id);
    if (!client) {
      await this.refreshClient(id);
    }

    return this.clients.get(id);
  }
  async toolCallByServerName(
    serverName: string,
    toolName: string,
    input: unknown,
    userContext?: any,
  ) {
    const clients = await this.getClients();
    const client = clients.find((c) => c.client.getInfo().name === serverName);
    if (!client) {
      if (this.storage) {
        const servers = await this.storage.loadAll();
        const server = servers.find((s) => s.name === serverName);
        if (server) {
          return this.toolCall(server.id, toolName, input, userContext);
        }
      }
      throw new Error(`Client ${serverName} not found`);
    }
    return this.toolCall(client.id, toolName, input, userContext);
  }
  async toolCall(
    id: string,
    toolName: string,
    input: unknown,
    userContext?: any,
  ) {
    return safe(() => this.getClient(id))
      .map((client) => {
        if (!client) throw new Error(`Client ${id} not found`);
        return client.client;
      })
      .map((client) => {
        const toolSchema = client.toolInfo?.find(
          (t) => t.name === toolName,
        )?.inputSchema;
        // Bind student-scoped tools to the caller's identity
        const enrichedInput = this.enrichInputWithUserContext(
          input,
          userContext,
          toolName,
          toolSchema,
        );

        return client.callTool(toolName, enrichedInput);
      })
      .map((res) => {
        if (res?.content && Array.isArray(res.content)) {
          const parsedResult = {
            ...res,
            content: res.content.map((c: any) => {
              if (c?.type === "text" && c?.text) {
                const parsed = safeJSONParse(c.text);
                return {
                  type: "text",
                  text: parsed.success ? parsed.value : c.text,
                };
              }
              return c;
            }),
          };
          return parsedResult;
        }
        return res;
      })
      .ifFail((err) => {
        console.log(`🔧 [MCP DEBUG] Tool call failed:`, {
          clientId: id,
          toolName,
          error: err,
          errorMessage: errorToString(err),
          errorName: err?.name || "ERROR",
          errorStack: err?.stack,
          errorDetails: JSON.stringify(err, null, 2),
        });

        return {
          isError: true,
          error: {
            message: errorToString(err),
            name: err?.name || "ERROR",
          },
          content: [],
        };
      })
      .unwrap();
  }

  /**
   * Bind student-scoped tool input to the caller's identity.
   *
   * Academic tools take `student_id` as an argument; trusting it would let any
   * caller (or a prompt-injected model) read another student's records. Any
   * tool that declares or receives `student_id` gets the session's student id,
   * and fails closed when there is no student context.
   */
  private enrichInputWithUserContext(
    input: any,
    userContext: any,
    toolName: string,
    toolSchema?: { properties?: Record<string, unknown> },
  ): any {
    const needsStudentId =
      this.toolExpectsStudentId(toolName) ||
      !!toolSchema?.properties?.student_id ||
      (!!input && typeof input === "object" && "student_id" in input);

    if (!needsStudentId) return input;

    if (!userContext?.studentId) {
      throw new Error(
        `Tool ${toolName} is only available to signed-in students`,
      );
    }

    return { ...(input ?? {}), student_id: userContext.studentId };
  }

  /**
   * Check if tool expects student_id parameter
   */
  private toolExpectsStudentId(toolName: string): boolean {
    const studentIdTools = [
      "get_course_materials",
      "list_enrolled_courses",
      "get_course_videos",
      "get_reading_materials",
      "view_course_announcements",
      "get_course_syllabus",
      "get_academic_schedule",
      "get_upcoming_assignments",
      "get_course_schedule",
      "get_faculty_contact",
      "view_assignment_info",
      "get_curriculum_guidance",
      "get_academic_standing",
      // Usage-limited tools that need student_id for tracking
      "ask_study_question",
      "generate_study_guide",
      "create_flashcards",
      "generate_quiz",
      "generate_exam_simulator",
      "submit_exam_answers",
      "convert_notes_to_flashcards",
    ];
    return studentIdTools.includes(toolName);
  }
}

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  autoDisconnectSeconds: number = 60 * 30, // 30 minutes
): MCPClientsManager {
  return new MCPClientsManager(storage, autoDisconnectSeconds);
}

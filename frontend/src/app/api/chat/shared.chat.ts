import "server-only";
import {
  LoadAPIKeyError,
  UIMessage,
  Tool,
  jsonSchema,
  tool as createTool,
  isToolUIPart,
  UIMessagePart,
  ToolUIPart,
  getToolName,
  UIMessageStreamWriter,
} from "ai";
import {
  ChatMention,
  ChatMetadata,
  ManualToolConfirmTag,
} from "app-types/chat";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import {
  AllowedMCPServer,
  McpServerCustomizationsPrompt,
  VercelAIMcpTool,
  VercelAIMcpToolTag,
} from "app-types/mcp";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";

import { ObjectJsonSchema7 } from "app-types/util";
import { safe } from "ts-safe";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { APP_DEFAULT_TOOL_KIT, loadAppDefaultToolKitWithAcademic } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";

export function filterMCPToolsByMentions(
  tools: Record<string, VercelAIMcpTool>,
  mentions: ChatMention[],
) {
  if (mentions.length === 0) {
    return tools;
  }
  const toolMentions = mentions.filter(
    (mention) => mention.type == "mcpTool" || mention.type == "mcpServer",
  );

  const metionsByServer = toolMentions.reduce(
    (acc, mention) => {
      if (mention.type == "mcpServer") {
        return {
          ...acc,
          [mention.serverId]: Object.values(tools).map(
            (tool) => tool._originToolName,
          ),
        };
      }
      return {
        ...acc,
        [mention.serverId]: [...(acc[mention.serverId] ?? []), mention.name],
      };
    },
    {} as Record<string, string[]>,
  );

  return objectFlow(tools).filter((_tool) => {
    if (!metionsByServer[_tool._mcpServerId]) return false;
    return metionsByServer[_tool._mcpServerId].includes(_tool._originToolName);
  });
}

export function filterMCPToolsByAllowedMCPServers(
  tools: Record<string, VercelAIMcpTool>,
  allowedMcpServers?: Record<string, AllowedMCPServer>,
): Record<string, VercelAIMcpTool> {
  if (!allowedMcpServers || Object.keys(allowedMcpServers).length === 0) {
    return {};
  }
  return objectFlow(tools).filter((_tool) => {
    if (!allowedMcpServers[_tool._mcpServerId]?.tools) return false;
    return allowedMcpServers[_tool._mcpServerId].tools.includes(
      _tool._originToolName,
    );
  });
}

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      inputSchema: value.inputSchema,
      description: value.description,
    });
  });
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, VercelAIMcpTool | Tool>,
  abortSignal?: AbortSignal,
  userContext?: any,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      if (VercelAIMcpToolTag.isMaybe(tool)) {
        return mcpClientsManager.toolCall(
          tool._mcpServerId,
          tool._originToolName,
          input,
          userContext,
        );
      }
      return tool.execute!(input, {
        toolCallId: part.toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        messages: [],
      });
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }
  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export function extractInProgressToolPart(message: UIMessage): ToolUIPart[] {
  if (message.role != "assistant") return [];
  if ((message.metadata as ChatMetadata)?.toolChoice != "manual") return [];
  return message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state == "output-available" &&
      ManualToolConfirmTag.isMaybe(part.output),
  ) as ToolUIPart[];
}

export function filterMcpServerCustomizations(
  tools: Record<string, VercelAIMcpTool>,
  mcpServerCustomization: Record<string, McpServerCustomizationsPrompt>,
): Record<string, McpServerCustomizationsPrompt> {
  const toolNamesByServerId = Object.values(tools).reduce(
    (acc, tool) => {
      if (!acc[tool._mcpServerId]) acc[tool._mcpServerId] = [];
      acc[tool._mcpServerId].push(tool._originToolName);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return Object.entries(mcpServerCustomization).reduce(
    (acc, [serverId, mcpServerCustomization]) => {
      if (!(serverId in toolNamesByServerId)) return acc;

      if (
        !mcpServerCustomization.prompt &&
        !Object.keys(mcpServerCustomization.tools ?? {}).length
      )
        return acc;

      const prompts: McpServerCustomizationsPrompt = {
        id: serverId,
        name: mcpServerCustomization.name,
        prompt: mcpServerCustomization.prompt,
        tools: mcpServerCustomization.tools
          ? objectFlow(mcpServerCustomization.tools).filter((_, key) => {
              return toolNamesByServerId[serverId].includes(key as string);
            })
          : {},
      };

      acc[serverId] = prompts;

      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );
}


export const loadMcpTools = (opt?: {
  mentions?: ChatMention[];
  allowedMcpServers?: Record<string, AllowedMCPServer>;
  userContext?: any;
}) =>
  safe(() => mcpClientsManager.tools())
    .map((tools) => {
      const filteredTools = opt?.mentions?.length 
        ? filterMCPToolsByMentions(tools, opt.mentions)
        : filterMCPToolsByAllowedMCPServers(tools, opt?.allowedMcpServers);
      
      // If user context is available, enhance tools with context-aware execute functions
      if (opt?.userContext) {
        return Object.entries(filteredTools).reduce((acc, [toolId, tool]) => {
          acc[toolId] = {
            ...tool,
            execute: (params: any, options: any) => {
              return mcpClientsManager.toolCall(
                tool._mcpServerId,
                tool._originToolName,
                params,
                opt.userContext
              );
            }
          };
          return acc;
        }, {} as Record<string, VercelAIMcpTool>);
      }
      
      return filteredTools;
    })
    .orElse({} as Record<string, VercelAIMcpTool>);


export const loadAppDefaultTools = async (opt?: {
  mentions?: ChatMention[];
  allowedAppDefaultToolkit?: string[];
}) => {
  try {
    const allowedAppDefaultToolkit =
      opt?.allowedAppDefaultToolkit ?? Object.values(AppDefaultToolkit);
    
    // Check if academic tools are needed
    const needsAcademicTools = allowedAppDefaultToolkit.includes(AppDefaultToolkit.Academic);
    
    // Load appropriate tool kit
    const tools = needsAcademicTools 
      ? await loadAppDefaultToolKitWithAcademic()
      : APP_DEFAULT_TOOL_KIT;

    if (opt?.mentions?.length) {
      const defaultToolMentions = opt.mentions.filter(
        (m) => m.type == "defaultTool",
      );
      return Array.from(Object.values(tools)).reduce((acc, t) => {
        const allowed = objectFlow(t).filter((_, k) => {
          return defaultToolMentions.some((m) => m.name == k);
        });
        return { ...acc, ...allowed };
      }, {});
    }

    return (
      allowedAppDefaultToolkit.reduce(
        (acc, key) => {
          return { ...acc, ...tools[key] };
        },
        {} as Record<string, Tool>,
      ) || {}
    );
  } catch (error) {
    console.error('[loadAppDefaultTools] Error loading tools:', error);
    return {} as Record<string, Tool>;
  }
};

export const convertToSavePart = <T extends UIMessagePart<any, any>>(
  part: T,
) => {
  return safe(
    exclude(part as any, ["providerMetadata", "callProviderMetadata"]) as T,
  )
    .map((v) => {
      return v;
    })
    .unwrap();
};

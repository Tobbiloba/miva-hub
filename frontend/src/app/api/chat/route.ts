import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import { agentRepository, chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildAcademicSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { getUserAcademicContext } from "lib/user/user-context";
import { 
  academicConversationMemory,
  getAcademicConversationContext,
  recordAcademicConversation 
} from "lib/ai/academic-conversation-memory";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      mentions = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = await customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId: session.user.id,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = mentions.find((m) => m.type === "agent")?.agentId;

    const agent = await rememberAgentAction(agentId, session.user.id);

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const isToolCallAllowed =
      supportToolCall && (toolChoice != "none" || mentions.length > 0);

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    // Get user academic context for all tool operations (moved outside to fix scope)
    const userAcademicContext = session?.user?.email 
      ? await getUserAcademicContext(session.user.email) 
      : null;

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
          
        logger.info(`[DEBUG] User context: email=${session?.user?.email}, studentId=${userAcademicContext?.studentId}`);

        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() => {
            // Auto-enable MIVA Academic MCP server for MIVA students
            let effectiveAllowedMcpServers = allowedMcpServers;
            if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
              logger.info(`Auto-enabling MIVA Academic MCP server for student ${userAcademicContext.studentId}`);
              // Find the MIVA Academic MCP server
              const mivaAcademicServer = mcpClients.find(client => 
                client.client.getInfo().name === 'miva-academic'
              );
              if (mivaAcademicServer) {
                const allTools = mivaAcademicServer.client.toolInfo?.map(t => t.name) || [];
                logger.info(`Found MIVA Academic server with ${allTools.length} tools: ${allTools.join(', ')}`);
                effectiveAllowedMcpServers = {
                  ...effectiveAllowedMcpServers,
                  [mivaAcademicServer.id]: {
                    tools: allTools
                  }
                };
              } else {
                logger.info(`MIVA Academic server not found in ${mcpClients.length} clients`);
              }
            } else {
              logger.info(`MCP auto-enable conditions not met: studentId=${userAcademicContext?.studentId}, email=${session?.user?.email}`);
            }
            
            return loadMcpTools({
              mentions,
              allowedMcpServers: effectiveAllowedMcpServers,
              userContext: userAcademicContext,
            });
          })
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        let APP_DEFAULT_TOOLS = {};
        if (isToolCallAllowed) {
          try {
            APP_DEFAULT_TOOLS = await loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
            });
          } catch (error) {
            console.error('Failed to load app default tools:', error);
          }
        }
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
                userAcademicContext,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        // Use academic system prompt for MIVA students, otherwise use regular prompt
        const baseSystemPrompt = userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')
          ? buildAcademicSystemPrompt(session.user, userPreferences, agent, userAcademicContext)
          : buildUserSystemPrompt(session.user, userPreferences, agent);

        // Add conversation context for academic students
        let conversationContext = "";
        if (userAcademicContext?.studentId) {
          conversationContext = getAcademicConversationContext(userAcademicContext.studentId);
          if (conversationContext) {
            conversationContext = `\n\n<conversation_context>\n${conversationContext}\n</conversation_context>`;
          }
        }

        const systemPrompt = mergeSystemPrompt(
          baseSystemPrompt + conversationContext,
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
        );

        const vercelAITooles = safe({ ...MCP_TOOLS, ...WORKFLOW_TOOLS })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        // Record academic conversation for memory and context building
        if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
          try {
            // Extract conversation details for memory
            const userText = message.parts.find(p => p.type === 'text')?.text || '';
            const assistantText = responseMessage.parts.find(p => p.type === 'text')?.text || '';
            
            // Extract topic from user message (simple heuristic)
            const topic = extractTopicFromMessage(userText);
            
            // Extract concepts mentioned (simple keyword matching)
            const concepts = extractConceptsFromText(userText + ' ' + assistantText);
            
            // Extract questions asked
            const questionsAsked = extractQuestionsFromText(userText);
            
            // Extract tools used from metadata
            const toolsUsed = responseMessage.parts
              .filter(p => p.type === 'tool-call')
              .map(p => (p as any).toolName)
              .filter(Boolean);
            
            // Determine confidence based on response quality (simple heuristic)
            const confidence = assistantText.includes('I don\'t know') || assistantText.includes('unclear') ? 0.5 : 0.8;
            
            recordAcademicConversation(
              userAcademicContext.studentId,
              topic,
              concepts,
              questionsAsked,
              toolsUsed,
              undefined, // courseCode - could be extracted from context
              confidence
            );
          } catch (error) {
            console.error('[Chat] Failed to record academic conversation:', error);
          }
        }

        if (agent) {
          agentRepository.updateAgent(agent.id, session.user.id, {
            updatedAt: new Date(),
          } as any);
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}

// Utility functions for conversation analysis
function extractTopicFromMessage(text: string): string {
  const lowercaseText = text.toLowerCase();
  
  // Academic topics - expand as needed
  const topicKeywords = {
    'algorithms': ['algorithm', 'sorting', 'search', 'complexity'],
    'programming': ['code', 'programming', 'function', 'variable', 'syntax'],
    'mathematics': ['math', 'calculus', 'algebra', 'equation', 'formula'],
    'data structures': ['array', 'list', 'tree', 'graph', 'stack', 'queue'],
    'database': ['sql', 'database', 'query', 'table', 'schema'],
    'networking': ['network', 'protocol', 'tcp', 'ip', 'internet'],
    'web development': ['html', 'css', 'javascript', 'web', 'frontend', 'backend'],
    'artificial intelligence': ['ai', 'machine learning', 'neural', 'model', 'training']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      return topic;
    }
  }
  
  // Default topic extraction - first few words
  const words = text.split(' ').slice(0, 3).join(' ');
  return words || 'General Discussion';
}

function extractConceptsFromText(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  const concepts: string[] = [];
  
  // Common academic concepts - expand as needed
  const conceptPatterns = [
    'algorithm', 'function', 'variable', 'loop', 'condition', 'recursion',
    'database', 'query', 'table', 'index', 'relationship',
    'network', 'protocol', 'packet', 'router', 'switch',
    'class', 'object', 'inheritance', 'polymorphism', 'encapsulation',
    'array', 'list', 'tree', 'graph', 'hash', 'sorting',
    'complexity', 'big o', 'time', 'space', 'efficiency',
    'web', 'html', 'css', 'javascript', 'api', 'rest'
  ];
  
  conceptPatterns.forEach(concept => {
    if (lowercaseText.includes(concept)) {
      concepts.push(concept);
    }
  });
  
  return [...new Set(concepts)]; // Remove duplicates
}

function extractQuestionsFromText(text: string): string[] {
  // Split by sentence endings and filter for questions
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  return sentences.filter(sentence => 
    sentence.includes('?') || 
    sentence.toLowerCase().startsWith('how') ||
    sentence.toLowerCase().startsWith('what') ||
    sentence.toLowerCase().startsWith('why') ||
    sentence.toLowerCase().startsWith('where') ||
    sentence.toLowerCase().startsWith('when') ||
    sentence.toLowerCase().startsWith('can you') ||
    sentence.toLowerCase().startsWith('could you')
  );
}

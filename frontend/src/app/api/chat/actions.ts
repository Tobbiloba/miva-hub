"use server";

import {
  LanguageModel,
  type UIMessage,
  generateObject,
  generateText,
  jsonSchema,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
  generateExampleToolSchemaPrompt,
} from "lib/ai/prompts";

import type { ChatModel, ChatThread } from "app-types/chat";

import { MCPToolInfo } from "app-types/mcp";
import { auth, getApiSession } from "auth/server";
import { customModelProvider } from "lib/ai/models";
import { chatRepository } from "lib/db/repository";
import { toAny } from "lib/utils";
import logger from "logger";
import { headers } from "next/headers";

import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: UIMessage; model: LanguageModel }) {
  await getUserId();
  const prompt = toAny(message.parts?.at(-1))?.text || "unknown";

  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt,
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const session = await getApiSession();
  const thread = await chatRepository.selectThread(threadId);

  if (!thread) {
    logger.error("Thread not found", threadId);
    return null;
  }
  if (thread.userId !== session?.user.id) {
    return null;
  }
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

// Server actions are public endpoints: every mutation verifies the caller
// owns the thread/message it targets.
async function assertThreadOwner(threadId: string, userId: string) {
  const thread = await chatRepository.selectThread(threadId);
  if (!thread || thread.userId !== userId) throw new Error("Thread not found");
}

async function assertMessageOwner(messageId: string, userId: string) {
  const ownerId = await chatRepository.selectMessageOwnerId(messageId);
  if (ownerId !== userId) throw new Error("Message not found");
}

export async function deleteMessageAction(messageId: string) {
  const userId = await getUserId();
  await assertMessageOwner(messageId, userId);
  await chatRepository.deleteChatMessage(messageId);
}

export async function deleteThreadAction(threadId: string) {
  const userId = await getUserId();
  await assertThreadOwner(threadId, userId);
  await chatRepository.deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  const userId = await getUserId();
  await assertMessageOwner(messageId, userId);
  await chatRepository.deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await assertThreadOwner(id, userId);
  await chatRepository.updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteAllThreads(userId);
}

export async function deleteUnarchivedThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteUnarchivedThreads(userId);
}

export async function generateExampleToolSchemaAction(options: {
  model?: ChatModel;
  toolInfo: MCPToolInfo;
  prompt?: string;
}) {
  await getUserId();
  const model = await customModelProvider.getModel(options.model);

  const schema = jsonSchema(
    toAny({
      ...options.toolInfo.inputSchema,
      properties: options.toolInfo.inputSchema?.properties ?? {},
      additionalProperties: false,
    }),
  );
  const { object } = await generateObject({
    model,
    schema,
    prompt: generateExampleToolSchemaPrompt({
      toolInfo: options.toolInfo,
      prompt: options.prompt,
    }),
  });

  return object;
}

export async function generateObjectAction({
  model,
  prompt,
  schema,
}: {
  model?: ChatModel;
  prompt: {
    system?: string;
    user?: string;
  };
  schema: JSONSchema7 | ObjectJsonSchema7;
}) {
  await getUserId();
  const result = await generateObject({
    model: await customModelProvider.getModel(model),
    system: prompt.system,
    prompt: prompt.user || "",
    schema: jsonSchemaToZod(schema),
  });
  return result.object;
}

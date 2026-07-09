import { smoothStream, streamText } from "ai";

import { ChatModel } from "app-types/chat";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import { chatRepository } from "lib/db/repository";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const {
      chatModel,
      message = "hello",
      threadId,
    } = json as {
      chatModel?: ChatModel;
      message: string;
      threadId: string;
    };

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Cheap model call, but still metered per user
    const rateLimit = checkRateLimit(`title:${session.user.id}`, 20, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    logger.info(
      `chatModel: ${chatModel?.provider}/${chatModel?.model}, threadId: ${threadId}`,
    );

    const model = await customModelProvider.getModel(chatModel);
    const result = streamText({
      model,
      system: CREATE_THREAD_TITLE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: message,
      abortSignal: request.signal,
      onFinish: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            userId: session.user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    return new Response(handleError(err), { status: 500 });
  }
}

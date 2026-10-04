import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { getApiSession } from "auth/server";
import { checkPaidAccess, paymentRequiredResponse } from "@/lib/billing/access";
import { colorize } from "consola/utils";
import { customModelProvider } from "lib/ai/models";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { userRepository } from "lib/db/repository";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getApiSession();

    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Paywall: AI features need a trial, subscription, or university seat
    const access = await checkPaidAccess(session.user.id);
    if (!access.allowed) return paymentRequiredResponse(access.reason);

    // Per-user rate limit: caps LLM spend abuse (20 messages/min/user)
    const rateLimit = await checkRateLimit(`chat:${session.user.id}`, 20, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = await customModelProvider.getModel(chatModel);
    const userPreferences =
      (await userRepository.getPreferences(session.user.id)) || undefined;

    return streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}

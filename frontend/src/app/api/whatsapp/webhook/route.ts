import { NextRequest, NextResponse } from "next/server";

import { handleInboundMessage, whatsappConfigured } from "@/lib/whatsapp";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "WhatsApp Webhook: " });

export const maxDuration = 60;

/**
 * GET /api/whatsapp/webhook — Meta's one-time webhook verification handshake.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    verifyToken &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === verifyToken
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook — inbound message events from Meta.
 * Always 200s quickly (Meta retries aggressively on non-200); the actual
 * handling failure surface is logged and answered in-channel instead.
 */
export async function POST(request: NextRequest) {
  try {
    if (!whatsappConfigured()) {
      return NextResponse.json({ status: "not configured" });
    }
    const payload = await request.json().catch(() => null);
    const messages: { from: string; text: string }[] = [];
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        for (const message of change?.value?.messages ?? []) {
          if (message?.type === "text" && message.from && message.text?.body) {
            messages.push({ from: message.from, text: message.text.body });
          }
        }
      }
    }

    // Sequential on purpose: a sender's LINK must land before their question.
    for (const message of messages) {
      await handleInboundMessage(message.from, message.text).catch((error) =>
        logger.error("message handling failed", error),
      );
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("webhook failed", error);
    return NextResponse.json({ status: "ok" });
  }
}

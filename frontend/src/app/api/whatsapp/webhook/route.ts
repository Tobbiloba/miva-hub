import { NextRequest, NextResponse } from "next/server";

import { safeEqual, verifyMetaSignature } from "@/lib/auth/signatures";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  handleInboundMessage,
  sendWhatsAppText,
  whatsappConfigured,
} from "@/lib/whatsapp";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "WhatsApp Webhook: " });

export const maxDuration = 60;

// LINK codes are 6 chars from a 32-letter alphabet (~1.07e9 values) and live
// 15 minutes. A failed guess can't be tied to a specific code (guessing is
// untargeted), so the defence is bounding guesses: per sender and globally.
const LINK_WINDOW_SEC = 15 * 60;
const LINK_ATTEMPTS_PER_PHONE = 5;
const LINK_ATTEMPTS_GLOBAL = 100;

async function linkAttemptAllowed(from: string): Promise<boolean> {
  const perPhone = await checkRateLimit(
    `wa-link:phone:${from}`,
    LINK_ATTEMPTS_PER_PHONE,
    LINK_WINDOW_SEC,
  );
  if (!perPhone.allowed) return false;
  const global = await checkRateLimit(
    "wa-link:global",
    LINK_ATTEMPTS_GLOBAL,
    LINK_WINDOW_SEC,
  );
  return global.allowed;
}

/**
 * GET /api/whatsapp/webhook — Meta's one-time webhook verification handshake.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    params.get("hub.mode") === "subscribe" &&
    safeEqual(params.get("hub.verify_token"), verifyToken)
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook — inbound message events from Meta.
 * Authenticated by Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body
 * keyed by WHATSAPP_APP_SECRET). Once authenticated it always 200s quickly
 * (Meta retries aggressively on non-200); handling failures are logged and
 * answered in-channel instead.
 */
export async function POST(request: NextRequest) {
  try {
    if (!whatsappConfigured()) {
      return NextResponse.json({ status: "not configured" });
    }

    const rawBody = await request.text();
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signature = request.headers.get("x-hub-signature-256");
      if (!verifyMetaSignature(rawBody, signature, appSecret)) {
        logger.warn("rejected webhook: invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      // Fail closed: without the app secret anyone could forge senders
      logger.error("WHATSAPP_APP_SECRET is not set; rejecting webhook");
      return NextResponse.json(
        { error: "Webhook signature verification not configured" },
        { status: 503 },
      );
    } else {
      logger.warn("WHATSAPP_APP_SECRET not set; skipping signature check");
    }

    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
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
      if (
        message.text.trim().toUpperCase().startsWith("LINK") &&
        !(await linkAttemptAllowed(message.from))
      ) {
        await sendWhatsAppText(
          message.from,
          "Too many link attempts. Please wait 15 minutes and try again.",
        );
        continue;
      }
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

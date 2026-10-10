import { s3Service } from "@/lib/aws/s3-service";
import { checkPaidAccess, paymentRequiredResponse } from "@/lib/billing/access";
import {
  CHAT_IMAGE_TYPES,
  MAX_CHAT_IMAGE_BYTES,
  attachmentUrl,
  chatImageKey,
  sniffImageType,
} from "@/lib/chat/attachments";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getApiSession } from "auth/server";
import logger from "logger";
import { NextResponse } from "next/server";

/**
 * POST /api/chat/attachments — store a photo for a chat message
 * (Snap-to-Solve). Multipart `file`; the browser has already shrunk it.
 * The bytes decide the type (never the client's claim), the key is under
 * the student's own prefix, and the response is the app URL the message
 * part keeps.
 */
export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const access = await checkPaidAccess(userId);
    if (!access.allowed) return paymentRequiredResponse(access.reason);

    const limit = await checkRateLimit(`chat-upload:${userId}`, 30, 60 * 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a photo" }, { status: 400 });
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "That photo is too large. Try a smaller one." },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) {
      return NextResponse.json(
        { error: "Use a JPG, PNG or WebP photo." },
        { status: 415 },
      );
    }

    const key = chatImageKey(userId, type);
    await s3Service.uploadFile(
      new File([bytes], `photo.${CHAT_IMAGE_TYPES[type]}`, { type }),
      key,
      { userId, userRole: "student" },
    );

    return NextResponse.json(
      { url: attachmentUrl(key), mediaType: type },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[chat/attachments] upload failed", error);
    return NextResponse.json(
      { error: "Couldn't upload the photo. Try again." },
      { status: 500 },
    );
  }
}

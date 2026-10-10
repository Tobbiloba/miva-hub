import { s3Service } from "@/lib/aws/s3-service";
import { isOwnChatKey } from "@/lib/chat/attachments";
import { getApiSession } from "auth/server";
import logger from "logger";
import { NextResponse } from "next/server";

/**
 * GET /api/chat/attachments/<key> — a student's own chat photo. Redirects
 * to a short-lived signed S3 URL; anyone else's key is a 404, so keys can't
 * be probed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await getApiSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = (await params).key.join("/");
  if (!isOwnChatKey(key, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = await s3Service.generateDownloadUrl(key, {
      userId: session.user.id,
      userRole: "student",
      expirationTime: 300,
    });
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, max-age=240");
    return response;
  } catch (error) {
    logger.warn("[chat/attachments] photo not available", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

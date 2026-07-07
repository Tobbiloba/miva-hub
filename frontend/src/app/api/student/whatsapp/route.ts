import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { WhatsAppLinkSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "WhatsApp Link API: " });

const CODE_TTL_MS = 15 * 60_000;

function generateCode(): string {
  // 6 chars, unambiguous alphabet (no 0/O/1/I)
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)];
  return code;
}

/** GET /api/student/whatsapp — current link status for the session user. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [link] = await pgDb
      .select({
        phoneNumber: WhatsAppLinkSchema.phoneNumber,
        verifiedAt: WhatsAppLinkSchema.verifiedAt,
        verifyCode: WhatsAppLinkSchema.verifyCode,
        verifyCodeExpiresAt: WhatsAppLinkSchema.verifyCodeExpiresAt,
      })
      .from(WhatsAppLinkSchema)
      .where(eq(WhatsAppLinkSchema.userId, session.user.id))
      .limit(1);

    const codeValid =
      link?.verifyCode &&
      link.verifyCodeExpiresAt &&
      link.verifyCodeExpiresAt > new Date();

    return NextResponse.json({
      linked: !!link?.verifiedAt,
      phoneNumber: link?.verifiedAt ? link.phoneNumber : null,
      pendingCode: codeValid ? link.verifyCode : null,
    });
  } catch (error) {
    logger.error("status failed", error);
    return NextResponse.json(
      { error: "Failed to load status" },
      { status: 500 },
    );
  }
}

/** POST /api/student/whatsapp — generate (or refresh) a linking code. */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await pgDb
      .insert(WhatsAppLinkSchema)
      .values({
        userId: session.user.id,
        verifyCode: code,
        verifyCodeExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: WhatsAppLinkSchema.userId,
        set: {
          verifyCode: code,
          verifyCodeExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ code, expiresAt });
  } catch (error) {
    logger.error("code generation failed", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 },
    );
  }
}

/** DELETE /api/student/whatsapp — unlink the phone number. */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await pgDb
      .delete(WhatsAppLinkSchema)
      .where(eq(WhatsAppLinkSchema.userId, session.user.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("unlink failed", error);
    return NextResponse.json({ error: "Failed to unlink" }, { status: 500 });
  }
}

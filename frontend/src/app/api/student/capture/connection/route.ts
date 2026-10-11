import { requireStudent } from "@/lib/auth/student";
import { revokeAllExtensionTokens } from "@/lib/extension/revoke";
import { issueExtensionToken } from "@/lib/extension/token";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ExtensionTokenSchema, UserSchema } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";

/**
 * GET /api/student/capture/connection: is the student's Askly Capture
 * extension signed in (a live extension token), and when it was last used.
 * POST connects the extension in one click (no password typed into it).
 * DELETE signs every extension out. Scoped to the session's student.
 */
export async function GET() {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const tokens = await pgDb
    .select({
      label: ExtensionTokenSchema.label,
      createdAt: ExtensionTokenSchema.createdAt,
      lastUsedAt: ExtensionTokenSchema.lastUsedAt,
    })
    .from(ExtensionTokenSchema)
    .where(
      and(
        eq(ExtensionTokenSchema.userId, session.user.id),
        isNull(ExtensionTokenSchema.revokedAt),
        gt(ExtensionTokenSchema.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(ExtensionTokenSchema.createdAt));

  const lastUsedAt = tokens
    .map((t) => t.lastUsedAt ?? t.createdAt)
    .sort((a, b) => +b - +a)[0];
  return NextResponse.json({
    connected: tokens.length > 0,
    devices: tokens.length,
    connectedAt: tokens.at(-1)?.createdAt ?? null,
    lastUsedAt: lastUsedAt ?? null,
  });
}

export async function DELETE() {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  await revokeAllExtensionTokens(session.user.id);
  return NextResponse.json({ connected: false });
}

/**
 * Mint an extension token for the signed-in student. The Askly Capture page
 * hands it to the extension through the extension's content script on this
 * site, so the student never types their password into the extension.
 */
export async function POST() {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  const limit = await checkRateLimit(
    `ext-connect:${session.user.id}`,
    10,
    60 * 60,
  );
  if (!limit.allowed) return rateLimitResponse(limit);

  const [[profile], { token, expiresAt }] = await Promise.all([
    pgDb
      .select({ isVolunteer: UserSchema.isVolunteer })
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1),
    issueExtensionToken(session.user.id, "Askly Capture"),
  ]);
  return NextResponse.json({
    token,
    expires_at: expiresAt.toISOString(),
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      is_volunteer: profile?.isVolunteer ?? false,
    },
  });
}

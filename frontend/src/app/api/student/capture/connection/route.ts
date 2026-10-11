import { requireStudent } from "@/lib/auth/student";
import { revokeAllExtensionTokens } from "@/lib/extension/revoke";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ExtensionTokenSchema } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";

/**
 * GET /api/student/capture/connection: is the student's Askly Capture
 * extension signed in (a live extension token), and when it was last used.
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

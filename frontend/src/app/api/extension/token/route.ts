import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import {
  issueExtensionToken,
  revokePresentedExtensionToken,
} from "@/lib/extension/token";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(256),
  label: z.string().trim().max(100).optional(),
});

/**
 * POST /api/extension/token — exchange Askly credentials for an extension
 * bearer token. Verifies the password with better-auth's own hasher without
 * creating a web session.
 */
export async function POST(request: NextRequest) {
  const ipLimit = await checkRateLimit(
    `ext-login-ip:${getClientIp(request)}`,
    10,
    60,
  );
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }
  const { email, password, label } = parsed.data;

  const emailLimit = await checkRateLimit(`ext-login:${email}`, 5, 15 * 60);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email, {
    includeAccounts: true,
  });
  const credential = found?.accounts.find((a) => a.providerId === "credential");

  if (!found || !credential?.password) {
    // Hash anyway so unknown emails take as long as wrong passwords.
    await ctx.password.hash(password);
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const valid = await ctx.password.verify({
    hash: credential.password,
    password,
  });
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }
  if (!found.user.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email address before connecting the extension" },
      { status: 403 },
    );
  }

  const [profile] = await pgDb
    .select({ isVolunteer: UserSchema.isVolunteer })
    .from(UserSchema)
    .where(eq(UserSchema.id, found.user.id))
    .limit(1);

  const { token, expiresAt } = await issueExtensionToken(
    found.user.id,
    label ?? "Askly Capture",
  );

  return NextResponse.json({
    token,
    expires_at: expiresAt.toISOString(),
    user: {
      id: found.user.id,
      name: found.user.name,
      email: found.user.email,
      is_volunteer: profile?.isVolunteer ?? false,
    },
  });
}

/** DELETE /api/extension/token — revoke the presented token (logout). */
export async function DELETE() {
  const revoked = await revokePresentedExtensionToken();
  if (!revoked) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}

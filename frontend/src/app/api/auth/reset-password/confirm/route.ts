import { auth } from "@/lib/auth/server";
import { APIError } from "better-auth/api";
import { NextRequest, NextResponse } from "next/server";

/**
 * Thin wrapper over better-auth's POST /reset-password so the existing
 * confirm page keeps its contract. better-auth validates the token from the
 * `verification` table, hashes with its own hasher (scrypt — the one sign-in
 * verifies against), updates the credential account, burns the token and
 * revokes existing sessions.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string" || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await auth.api.resetPassword({ body: { token, newPassword: password } });

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 400) {
      const message = error.body?.message ?? "";
      return NextResponse.json(
        {
          error: /token/i.test(message)
            ? "Invalid or expired reset token"
            : message || "Invalid request",
        },
        { status: 400 },
      );
    }
    console.error("Password confirm error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 },
    );
  }
}

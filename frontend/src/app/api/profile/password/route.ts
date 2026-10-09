import { revokeAllExtensionTokens } from "@/lib/extension/revoke";
import { auth } from "@/lib/auth/server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});

/**
 * POST /api/profile/password — change the signed-in user's password.
 * Delegates to better-auth, which owns the credential account and its hash
 * (the legacy user.password column is never populated by better-auth).
 */
export async function POST(request: NextRequest) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const parsed = passwordChangeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation failed",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "New password must be different from current password",
      },
      { status: 400 },
    );
  }

  try {
    const changed = await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: requestHeaders,
    });
    // Sessions are revoked above; extension tokens are credentials too.
    await revokeAllExtensionTokens(changed.user.id);
    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    if (error instanceof APIError) {
      // e.g. INVALID_PASSWORD for a wrong current password
      return NextResponse.json(
        {
          success: false,
          error:
            error.body?.code === "INVALID_PASSWORD"
              ? "Current password is incorrect"
              : (error.body?.message ?? "Failed to change password"),
        },
        { status: 400 },
      );
    }
    console.error("[Profile Password API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 },
    );
  }
}

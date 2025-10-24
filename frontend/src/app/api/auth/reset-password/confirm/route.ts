import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema, AccountSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getResetToken, deleteResetToken } from "@/lib/auth/reset-token-store";

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Token, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if token is valid
    const tokenData = getResetToken(token);

    if (!tokenData || tokenData.email !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find user
    const [user] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db
      .update(UserSchema)
      .set({
        password: hashedPassword,
      })
      .where(eq(UserSchema.id, user.id));

    // Also update account password (Better Auth stores password in account table for email provider)
    await db
      .update(AccountSchema)
      .set({
        password: hashedPassword,
      })
      .where(
        and(
          eq(AccountSchema.userId, user.id),
          eq(AccountSchema.providerId, "credential")
        )
      );

    // Delete used token
    deleteResetToken(token);

    console.log(`Password reset successful for ${email}`);

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password confirm error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

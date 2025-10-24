import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/smtp-service";
import { randomBytes } from "crypto";
import { storeResetToken } from "@/lib/auth/reset-token-store";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Don't reveal whether email exists for security reasons
      return NextResponse.json(
        {
          message:
            "If an account exists with this email, you will receive a password reset link shortly.",
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex");

    // Store reset token in memory (1 hour expiry)
    storeResetToken(resetToken, email);

    console.log(
      `Password reset requested for ${email} - Token: ${resetToken}`
    );

    // Send password reset email
    try {
      const fs = await import("fs");
      const path = await import("path");
      const resetTemplate = fs.readFileSync(
        path.join(process.cwd(), "src/lib/email/templates/password-reset.html"),
        "utf-8"
      );

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://miva-hub.com"}/reset-password/confirm?token=${resetToken}&email=${encodeURIComponent(email)}`;

      const resetHtml = resetTemplate
        .replace("{{userName}}", user.name || "User")
        .replace("{{resetLink}}", resetLink)
        .replace(/{{resetLink}}/g, resetLink);

      await sendEmail({
        to: user.email,
        subject: "Reset Your MIVA Hub Password",
        html: resetHtml,
      });

      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      // Still return success to not reveal email existence
    }

    return NextResponse.json(
      {
        message:
          "If an account exists with this email, you will receive a password reset link shortly.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

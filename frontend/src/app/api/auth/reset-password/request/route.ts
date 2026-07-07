import { NextRequest, NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/auth/password-reset";

const NEUTRAL_MESSAGE =
  "If an account exists with this email, you will receive a password reset link shortly.";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Never reveal whether the email exists
    await sendPasswordResetEmail(email);

    return NextResponse.json({ message: NEUTRAL_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/auth/password-reset";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const NEUTRAL_MESSAGE =
  "If an account exists with this email, you will receive a password reset link shortly.";

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkRateLimit(
      `pw-reset:ip:${getClientIp(request)}`,
      5,
      15 * 60,
    );
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Per-recipient cap stops mail-bombing one inbox from many IPs. Answer
    // neutrally either way — never reveal whether the email exists.
    const emailLimit = await checkRateLimit(
      `pw-reset:email:${email.toLowerCase().trim()}`,
      3,
      60 * 60,
    );
    if (emailLimit.allowed) {
      await sendPasswordResetEmail(email);
    }

    return NextResponse.json({ message: NEUTRAL_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 },
    );
  }
}

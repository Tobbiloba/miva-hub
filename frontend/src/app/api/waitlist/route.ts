import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// In-memory only: entries are lost on restart and not shared across
// instances. Persisting them needs a table (schema change) — not added here.
const waitlistEntries: Array<{ email: string; name: string; timestamp: Date }> =
  [];

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit(
      `waitlist:${getClientIp(request)}`,
      5,
      60 * 60,
    );
    if (!limit.allowed) return rateLimitResponse(limit);

    const { email, name } = await request.json();

    // Validation
    if (
      !email ||
      !name ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      return NextResponse.json(
        { message: "Email and name are required" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 254 || name.length > 200 || !emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    const normalized = email.toLowerCase().trim();

    // Same answer for new and existing entries — don't reveal who's listed
    if (!waitlistEntries.some((entry) => entry.email === normalized)) {
      waitlistEntries.push({
        email: normalized,
        name: name.trim(),
        timestamp: new Date(),
      });
    }

    return NextResponse.json(
      {
        message: "Successfully joined the waitlist",
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { message: "An error occurred while joining the waitlist" },
      { status: 500 },
    );
  }
}

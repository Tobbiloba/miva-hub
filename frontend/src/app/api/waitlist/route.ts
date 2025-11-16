import { NextRequest, NextResponse } from "next/server";

// In-memory storage (in production, use a database)
const waitlistEntries: Array<{ email: string; name: string; timestamp: Date }> =
  [];

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    // Validation
    if (!email || !name) {
      return NextResponse.json(
        { message: "Email and name are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Check if email already exists
    if (waitlistEntries.some((entry) => entry.email === email)) {
      return NextResponse.json(
        { message: "This email is already on the waitlist" },
        { status: 409 }
      );
    }

    // Add to waitlist
    waitlistEntries.push({
      email,
      name,
      timestamp: new Date(),
    });

    // TODO: In production, integrate with email service
    // For now, just log to console
    console.log(`✅ New waitlist signup: ${name} (${email})`);
    console.log(`📊 Total waitlist entries: ${waitlistEntries.length}`);

    return NextResponse.json(
      {
        message: "Successfully joined the waitlist",
        email,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { message: "An error occurred while joining the waitlist" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For development only - remove in production
  return NextResponse.json(
    {
      totalEntries: waitlistEntries.length,
      entries: waitlistEntries,
    },
    { status: 200 }
  );
}

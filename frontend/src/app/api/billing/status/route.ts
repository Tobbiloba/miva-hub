import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getBillingStatus } from "@/lib/billing/status";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getBillingStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching billing status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

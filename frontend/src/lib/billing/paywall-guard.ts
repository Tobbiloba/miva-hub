import { NextResponse } from "next/server";
import { getBillingStatus } from "./status";

/**
 * Check if a student is paywalled. Call from API routes that serve student data.
 * Returns a 402 response if paywalled, or null if access is allowed.
 *
 * Usage in API routes:
 *   const blocked = await checkPaywall(session.user.id, session.user.role);
 *   if (blocked) return blocked;
 */
export async function checkPaywall(
  userId: string,
  role?: string | null,
): Promise<NextResponse | null> {
  // Only students are subject to paywall
  if (role !== "student") return null;

  const billing = await getBillingStatus(userId);

  if (billing.paywalled) {
    return NextResponse.json(
      { error: "paywall_active", redirect: "/billing" },
      { status: 402 },
    );
  }

  return null;
}

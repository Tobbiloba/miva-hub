import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { hasActiveSubscription } from "@/lib/payment/check-subscription";
import { redirect } from "next/navigation";
import React from "react";

/**
 * Server component that guards routes from unpaid users
 * Redirects non-admin users without active subscriptions to pricing page
 */
export async function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      // Admins bypass payment requirement
      if (session.user.role !== "admin") {
        const hasSubscription = await hasActiveSubscription(session.user.id);

        // Redirect unpaid users to pricing page
        if (!hasSubscription) {
          redirect("/pricing?required=true");
        }
      }
    }
  } catch (error) {
    // Next.js redirect() throws a special error with a digest
    // We need to re-throw it so the redirect works properly
    if (error instanceof Error && error.digest?.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Error checking subscription:", error);
    // On actual errors, redirect to pricing with error flag
    redirect("/pricing?error=true");
  }

  return <>{children}</>;
}

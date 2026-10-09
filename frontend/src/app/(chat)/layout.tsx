import { ChatShell } from "@/components/layouts/chat-shell";
import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { getBillingStatus } from "@/lib/billing/status";
import { auth } from "auth/server";

export const experimental_ppr = true;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const headers = await getHeaders();
  const session = await auth.api
    .getSession({
      headers,
    })
    .catch(() => null);

  // Paywall: redirect paywalled students to /billing
  if (session?.user?.role === "student") {
    const billing = await getBillingStatus(session.user.id);
    if (billing.paywalled) {
      redirect("/billing");
    }
  }
  return <ChatShell session={session || undefined}>{children}</ChatShell>;
}

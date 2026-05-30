import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;

  try {
    session = await getSession();
  } catch {
    redirect("/sign-in");
  }

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Lockdown mode: no sidebar, no header, just centered content
  return <>{children}</>;
}

import { getSession } from "@/lib/auth/server";
import { CHAT_FIRST } from "@/lib/config/product";
import { redirect } from "next/navigation";

/**
 * Agents and the tool showcase are power-user surfaces inherited from the
 * chat fork. In the chat-first student product they're archived for students.
 */
export async function PowerUserLayout({
  children,
}: { children: React.ReactNode }) {
  if (CHAT_FIRST) {
    const session = await getSession();
    if (session?.user.role === "student") redirect("/");
  }
  return <>{children}</>;
}

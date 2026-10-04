import { auth } from "auth/server";
import { checkIsSuperAdmin, isSuperAdmin } from "lib/auth/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

// MCP servers are platform-global: only super_admin may view or manage them.
export default async function McpLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || (!isSuperAdmin(user) && !(await checkIsSuperAdmin(user.id)))) {
    notFound();
  }
  return <>{children}</>;
}

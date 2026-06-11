import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { checkIsAdmin, checkIsSuperAdmin } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
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

  // Check admin role from DB — better-auth sessions don't include custom columns
  if (!session?.user?.id || !(await checkIsAdmin(session.user.id))) {
    redirect("/unauthorized");
  }

  const isSuperAdmin = await checkIsSuperAdmin(session.user.id);

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-screen">
        <AdminSidebar session={session} isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 flex-1">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

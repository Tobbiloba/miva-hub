import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";

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

  // Double-check admin authorization using centralized helper
  if (!isAdminEmail(session?.user?.email)) {
    redirect("/unauthorized");
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-screen">
        <AdminSidebar session={session} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 flex-1">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
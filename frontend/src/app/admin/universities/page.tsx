import { UniversityManagementClient } from "@/components/admin/university-management-client";
import { checkIsSuperAdmin } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function UniversitiesPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/sign-in");
  }

  // Platform-level page: super admins only
  if (!session?.user?.id || !(await checkIsSuperAdmin(session.user.id))) {
    redirect("/admin");
  }

  return <UniversityManagementClient />;
}

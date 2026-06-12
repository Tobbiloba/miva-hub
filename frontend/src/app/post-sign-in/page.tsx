import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

/**
 * Role-based dispatch after sign-in. Sign-in forms use this as their
 * callbackURL so each persona lands on their own home instead of the chat.
 */
export default async function PostSignInPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const role = session.user.role;

  if (role === "admin" || role === "super_admin") {
    redirect("/admin");
  }
  if (role === "faculty") {
    redirect("/faculty");
  }
  redirect("/");
}

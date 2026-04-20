import "server-only";
import { getSession } from "./server";
import { NextResponse } from "next/server";

/**
 * Check if a user object has admin role.
 * Works with session.user from Better Auth (role comes from DB enum column).
 */
export function isAdmin(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Require admin access for server components and API routes.
 * Returns session if admin, NextResponse error otherwise.
 */
export async function requireAdmin() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    return session;
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

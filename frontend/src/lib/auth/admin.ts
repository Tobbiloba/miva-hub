import "server-only";
import { getSession } from "./server";
import { NextResponse } from "next/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

/**
 * Check if a user object has admin role (sync — checks in-memory value only).
 * Kept for backward compatibility with existing call sites that don't await.
 */
export function isAdmin(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Check if a user has admin role by querying the DB.
 * Use this when the session user object might not include `role`
 * (better-auth sessions don't include custom user columns).
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const [row] = await pgDb
    .select({ role: UserSchema.role })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  return row?.role === "admin";
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

    // Check role on session first (fast path), fall back to DB query
    if (!isAdmin(session.user) && !(await checkIsAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    return session;
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

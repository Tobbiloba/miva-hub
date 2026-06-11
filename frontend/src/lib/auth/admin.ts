import "server-only";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "./server";

/**
 * Role model:
 * - super_admin — platform operator; belongs to no university, can manage
 *   all tenants (approve universities, suspend, etc.)
 * - admin — university administrator; scoped to their universityId
 * - faculty / student — scoped to their universityId
 */

/**
 * Check if a user object has admin role (sync — checks in-memory value only).
 * super_admin implies admin everywhere an admin check is used.
 */
export function isAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return user?.role === "admin" || user?.role === "super_admin";
}

export function isSuperAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return user?.role === "super_admin";
}

/** Fetch role + universityId straight from the DB. */
async function fetchUserRole(
  userId: string,
): Promise<{ role: string | null; universityId: string | null } | undefined> {
  const [row] = await pgDb
    .select({ role: UserSchema.role, universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  return row;
}

/**
 * Check if a user has admin (or super_admin) role by querying the DB.
 * Use this when the session user object might not include `role`
 * (better-auth sessions don't include custom user columns).
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const row = await fetchUserRole(userId);
  return row?.role === "admin" || row?.role === "super_admin";
}

export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const row = await fetchUserRole(userId);
  return row?.role === "super_admin";
}

/**
 * Require admin access for server components and API routes.
 * Accepts both university admins and platform super_admins.
 * Returns session if admin, NextResponse error otherwise.
 */
export async function requireAdmin() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check role on session first (fast path), fall back to DB query
    if (!isAdmin(session.user) && !(await checkIsAdmin(session.user.id))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    return session;
  } catch {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
}

/**
 * Require platform super_admin access (cross-tenant operations:
 * approving universities, suspending tenants, platform settings).
 */
export async function requireSuperAdmin() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (
      !isSuperAdmin(session.user) &&
      !(await checkIsSuperAdmin(session.user.id))
    ) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 },
      );
    }

    return session;
  } catch {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
}

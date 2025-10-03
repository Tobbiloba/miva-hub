import "server-only";
import { getSession } from "./server";
import { NextResponse } from "next/server";

// Centralized admin email for easy maintenance
const ADMIN_EMAIL = "oluwatobi.salau@miva.edu.ng";

/**
 * Check if the current session belongs to an admin user
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getSession();
    return session?.user?.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

/**
 * Require admin access for API routes
 * @returns Promise<Session | NextResponse> - session if admin, error response if not
 */
export async function requireAdmin() {
  try {
    const session = await getSession();
    
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    return session;
  } catch (error) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

/**
 * Check if an email is the admin email
 * @param email - Email to check
 * @returns boolean - true if admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

/**
 * Get the admin email (for display purposes)
 * @returns string - admin email
 */
export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}
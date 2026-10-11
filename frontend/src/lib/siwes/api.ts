import "server-only";

import { requireStudent } from "@/lib/auth/student";
import {
  checkPremiumAccess,
  premiumRequiredResponse,
} from "@/lib/billing/access";
import { NextResponse } from "next/server";
import { SiwesError } from "./index";

/**
 * Guard for every SIWES API route: a signed-in, active student (401/403
 * JSON otherwise) on Askly Premium (403 PREMIUM_REQUIRED). The student id
 * always comes from the session.
 */
export async function requireSiwesStudent(): Promise<
  { userId: string } | NextResponse | Response
> {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;
  const access = await checkPremiumAccess(session.user.id);
  if (!access.allowed) return premiumRequiredResponse(access.reason);
  return { userId: session.user.id };
}

/** SiwesError → its JSON status; anything else is a real failure */
export function siwesErrorResponse(error: unknown) {
  if (error instanceof SiwesError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  throw error;
}

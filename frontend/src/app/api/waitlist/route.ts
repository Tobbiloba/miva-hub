import { pgDb } from "@/lib/db/pg/db.pg";
import { WaitlistSignupSchema } from "@/lib/db/pg/schema.pg";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import logger from "logger";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const WaitlistInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: optionalText(120),
  university: optionalText(160),
  role: z.enum(["student", "lecturer", "other"]).default("student"),
  source: optionalText(40),
});

/**
 * Public (no session): the landing page's "Join the waitlist" form.
 * Idempotent per email, so a repeat sign-up still answers 200 and never
 * reveals whether an address was already on the list.
 */
export async function POST(request: Request) {
  const rate = await checkRateLimit(
    `waitlist:${getClientIp(request)}`,
    10,
    3600,
  );
  if (!rate.allowed) return rateLimitResponse(rate);

  const body = await request.json().catch(() => null);
  const parsed = WaitlistInput.safeParse(body);
  if (!parsed.success) {
    const badEmail = parsed.error.issues.some((i) => i.path[0] === "email");
    return NextResponse.json(
      {
        error: badEmail
          ? "Enter a valid email address."
          : "Check the form and try again.",
      },
      { status: 400 },
    );
  }

  try {
    await pgDb
      .insert(WaitlistSignupSchema)
      .values(parsed.data)
      .onConflictDoNothing({ target: WaitlistSignupSchema.email });
  } catch (error) {
    logger.error("Waitlist sign-up failed", error);
    return NextResponse.json(
      { error: "Couldn't save that right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

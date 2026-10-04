"use server";

import { checkRateLimit } from "@/lib/rate-limit";
import { userRepository } from "lib/db/repository";
import { headers } from "next/headers";

/**
 * Sign-up form pre-check. Public (no session), so it's an email-enumeration
 * oracle: cap it per client IP. Over the limit it answers "not taken" and the
 * real duplicate check happens at /api/auth/register.
 */
export async function existsByEmailAction(email: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const limit = await checkRateLimit(`email-exists:${ip}`, 20, 10 * 60);
  if (!limit.allowed) return false;

  const exists = await userRepository.existsByEmail(email);
  return exists;
}

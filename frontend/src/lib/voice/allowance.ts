import "server-only";

import { getSubscriptionTier } from "@/lib/billing/access";
import { and, eq, gte, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { VivaSessionSchema } from "lib/db/pg/schema.pg";
import { studentUtcOffset } from "lib/deadlines/time";
import {
  MAX_SESSION_SECONDS,
  type VoiceTier,
  voiceAllowancePlan,
  voiceLimitMessage,
} from "./allowance-rules";

/** How the student has access, as checkPaidAccess reports it */
type AccessVia = "exempt_role" | "trial" | "subscription" | "university";

export type VoiceAllowance = {
  kind: "trial" | "monthly";
  tier: VoiceTier;
  limitSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  resetsAt: string | null;
};

/**
 * The student's voice minutes for the current period. Each session counts
 * from its start to its end, capped at MAX_SESSION_SECONDS; a session that
 * was never closed counts up to now (still capped), so a crashed tab can't
 * cost more than one session's worth.
 */
export async function getVoiceAllowance(
  userId: string,
  via: AccessVia,
): Promise<VoiceAllowance> {
  const now = new Date();
  // The student's own plan wins over the trial (they can subscribe during it)
  const tier: VoiceTier =
    (await getSubscriptionTier(userId)) ??
    (via === "trial" ? "trial" : "standard");
  const plan = voiceAllowancePlan(tier, now, studentUtcOffset(now));

  const [row] = await pgDb
    .select({
      used: sql<number>`COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM LEAST(
        COALESCE(${VivaSessionSchema.endedAt}, CURRENT_TIMESTAMP),
        ${VivaSessionSchema.startedAt} + make_interval(secs => ${MAX_SESSION_SECONDS})
      ) - ${VivaSessionSchema.startedAt}))), 0)::float8`,
    })
    .from(VivaSessionSchema)
    .where(
      and(
        eq(VivaSessionSchema.studentId, userId),
        plan.periodStart
          ? gte(VivaSessionSchema.startedAt, plan.periodStart)
          : undefined,
      ),
    );

  const usedSeconds = Math.round(Number(row?.used ?? 0));
  return {
    kind: plan.kind,
    tier: plan.tier,
    limitSeconds: plan.limitSeconds,
    usedSeconds,
    remainingSeconds: Math.max(0, plan.limitSeconds - usedSeconds),
    resetsAt: plan.resetsAt?.toISOString() ?? null,
  };
}

/** The 429 a student gets when their voice minutes are used up. */
export function voiceLimitResponse(allowance: VoiceAllowance): Response {
  return Response.json(
    {
      error: voiceLimitMessage(allowance),
      code: "VOICE_LIMIT_REACHED",
      allowance,
    },
    { status: 429 },
  );
}

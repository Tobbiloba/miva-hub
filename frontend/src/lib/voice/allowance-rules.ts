/**
 * Voice Coach minute allowances. Live voice costs real money per minute, so
 * each student gets a budget:
 *   - free trial: 10 minutes in total
 *   - subscription or university seat: 60 minutes per calendar month
 *   - Askly Premium: 300 minutes per calendar month
 *
 * Usage is measured from viva_session's server-recorded start and end
 * times, never from anything the browser reports.
 */

/** Which allowance applies: the student's own plan first, then the trial */
export type VoiceTier = "trial" | "standard" | "premium";

/** One Live audio session can't run longer than this (Gemini's limit too) */
export const MAX_SESSION_SECONDS = 15 * 60;
/** Don't start a session with less than this left */
export const MIN_START_SECONDS = 30;

export const TRIAL_VOICE_SECONDS = 10 * 60;
export const MONTHLY_VOICE_SECONDS = 60 * 60;
export const PREMIUM_VOICE_SECONDS = 300 * 60;

export type VoiceAllowancePlan = {
  kind: "trial" | "monthly";
  tier: VoiceTier;
  limitSeconds: number;
  /** Count sessions started at or after this; null = all time (trial) */
  periodStart: Date | null;
  /** When the allowance refills; null for the trial */
  resetsAt: Date | null;
};

/**
 * The first instant of `now`'s calendar month in the given UTC offset
 * ("+01:00"), and of the month after.
 */
export function monthBounds(
  now: Date,
  utcOffset: string,
): { start: Date; next: Date } {
  const sign = utcOffset.startsWith("-") ? -1 : 1;
  const [h, m] = utcOffset.slice(1).split(":").map(Number);
  const offsetMs = sign * (h * 60 + m) * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const y = local.getUTCFullYear();
  const mo = local.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, mo, 1) - offsetMs),
    next: new Date(Date.UTC(y, mo + 1, 1) - offsetMs),
  };
}

export function voiceAllowancePlan(
  tier: VoiceTier,
  now: Date,
  utcOffset: string,
): VoiceAllowancePlan {
  if (tier === "trial") {
    return {
      kind: "trial",
      tier,
      limitSeconds: TRIAL_VOICE_SECONDS,
      periodStart: null,
      resetsAt: null,
    };
  }
  const { start, next } = monthBounds(now, utcOffset);
  return {
    kind: "monthly",
    tier,
    limitSeconds:
      tier === "premium" ? PREMIUM_VOICE_SECONDS : MONTHLY_VOICE_SECONDS,
    periodStart: start,
    resetsAt: next,
  };
}

/** Seconds a new session may run: what's left, capped per session. */
export function sessionLimitSeconds(remainingSeconds: number): number {
  return Math.max(0, Math.min(remainingSeconds, MAX_SESSION_SECONDS));
}

/** What the Voice Coach page shows about a student's minutes */
export type AllowanceView = {
  kind: "trial" | "monthly";
  tier?: VoiceTier;
  limitSeconds: number;
  remainingSeconds: number;
  resetsAt: string | null;
};

/** What to tell a student whose minutes are used up */
export function voiceLimitMessage(a: {
  kind: "trial" | "monthly";
  tier?: VoiceTier;
  limitSeconds: number;
}): string {
  if (a.kind === "trial") {
    return "You've used the 10 voice minutes in your free trial. Subscribe for 60 minutes a month, or Askly Premium for 300.";
  }
  const total = Math.round(a.limitSeconds / 60);
  return a.tier === "premium"
    ? `You've used your ${total} voice minutes for this month. They refill on the 1st.`
    : `You've used your ${total} voice minutes for this month. They refill on the 1st, or upgrade to Askly Premium for 300 a month.`;
}

/** "7 of 10 free-trial voice minutes left", "54 of 60 voice minutes left this month · refills 1 Nov" */
export function allowanceLine(a: AllowanceView, locale?: string): string {
  const total = Math.round(a.limitSeconds / 60);
  const minutes = Math.floor(a.remainingSeconds / 60);
  const left =
    minutes >= 1 ? `${minutes} of ${total}` : `Under a minute of your ${total}`;
  if (a.kind === "trial") return `${left} free-trial voice minutes left`;
  const refill = a.resetsAt
    ? new Date(a.resetsAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        timeZone: "Africa/Lagos",
      })
    : null;
  return `${left} voice minutes left this month${refill ? ` · refills ${refill}` : ""}`;
}

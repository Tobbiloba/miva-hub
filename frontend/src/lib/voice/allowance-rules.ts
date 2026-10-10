/**
 * Voice Coach minute allowances. Live voice costs real money per minute, so
 * each student gets a budget:
 *   - free trial: 10 minutes in total
 *   - subscription or university seat: 60 minutes per calendar month
 * (Premium, 300 minutes a month, plugs in here when that plan exists.)
 *
 * Usage is measured from viva_session's server-recorded start and end
 * times, never from anything the browser reports.
 */

export type VoiceAccessVia =
  | "exempt_role"
  | "trial"
  | "subscription"
  | "university";

/** One Live audio session can't run longer than this (Gemini's limit too) */
export const MAX_SESSION_SECONDS = 15 * 60;
/** Don't start a session with less than this left */
export const MIN_START_SECONDS = 30;

export const TRIAL_VOICE_SECONDS = 10 * 60;
export const MONTHLY_VOICE_SECONDS = 60 * 60;

export type VoiceAllowancePlan = {
  kind: "trial" | "monthly";
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
  via: VoiceAccessVia,
  now: Date,
  utcOffset: string,
): VoiceAllowancePlan {
  if (via === "trial") {
    return {
      kind: "trial",
      limitSeconds: TRIAL_VOICE_SECONDS,
      periodStart: null,
      resetsAt: null,
    };
  }
  const { start, next } = monthBounds(now, utcOffset);
  return {
    kind: "monthly",
    limitSeconds: MONTHLY_VOICE_SECONDS,
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
  limitSeconds: number;
  remainingSeconds: number;
  resetsAt: string | null;
};

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

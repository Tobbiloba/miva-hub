import { describe, expect, it } from "vitest";
import {
  MAX_SESSION_SECONDS,
  MONTHLY_VOICE_SECONDS,
  TRIAL_VOICE_SECONDS,
  monthBounds,
  sessionLimitSeconds,
  voiceAllowancePlan,
} from "./allowance-rules";

describe("monthBounds", () => {
  it("uses the student's month, not UTC's", () => {
    // 23:30 UTC on 31 Oct is already 00:30 on 1 Nov in Lagos (+01:00)
    const { start, next } = monthBounds(
      new Date("2026-10-31T23:30:00Z"),
      "+01:00",
    );
    expect(start.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(next.toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });

  it("rolls over the year", () => {
    const { start, next } = monthBounds(
      new Date("2026-12-15T12:00:00Z"),
      "+00:00",
    );
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(next.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("voiceAllowancePlan", () => {
  const now = new Date("2026-10-10T10:00:00Z");

  it("gives a trial 10 minutes in total", () => {
    const plan = voiceAllowancePlan("trial", now, "+01:00");
    expect(plan).toMatchObject({
      kind: "trial",
      limitSeconds: TRIAL_VOICE_SECONDS,
      periodStart: null,
      resetsAt: null,
    });
  });

  it("gives paid and university students 60 minutes a month", () => {
    for (const via of ["subscription", "university", "exempt_role"] as const) {
      const plan = voiceAllowancePlan(via, now, "+01:00");
      expect(plan.kind).toBe("monthly");
      expect(plan.limitSeconds).toBe(MONTHLY_VOICE_SECONDS);
      expect(plan.periodStart?.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    }
  });
});

describe("sessionLimitSeconds", () => {
  it("caps a session at what's left and at the per-session maximum", () => {
    expect(sessionLimitSeconds(120)).toBe(120);
    expect(sessionLimitSeconds(3600)).toBe(MAX_SESSION_SECONDS);
    expect(sessionLimitSeconds(-5)).toBe(0);
  });
});

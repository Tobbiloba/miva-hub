import { describe, expect, it } from "vitest";
import {
  MAX_SESSION_SECONDS,
  MONTHLY_VOICE_SECONDS,
  PREMIUM_VOICE_SECONDS,
  TRIAL_VOICE_SECONDS,
  allowanceLine,
  monthBounds,
  sessionLimitSeconds,
  voiceAllowancePlan,
  voiceLimitMessage,
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

  it("gives standard plans 60 minutes and Premium 300 minutes a month", () => {
    const standard = voiceAllowancePlan("standard", now, "+01:00");
    expect(standard.kind).toBe("monthly");
    expect(standard.limitSeconds).toBe(MONTHLY_VOICE_SECONDS);
    expect(standard.periodStart?.toISOString()).toBe(
      "2026-09-30T23:00:00.000Z",
    );
    const premium = voiceAllowancePlan("premium", now, "+01:00");
    expect(premium).toMatchObject({ kind: "monthly", tier: "premium" });
    expect(premium.limitSeconds).toBe(PREMIUM_VOICE_SECONDS);
  });
});

describe("sessionLimitSeconds", () => {
  it("caps a session at what's left and at the per-session maximum", () => {
    expect(sessionLimitSeconds(120)).toBe(120);
    expect(sessionLimitSeconds(3600)).toBe(MAX_SESSION_SECONDS);
    expect(sessionLimitSeconds(-5)).toBe(0);
  });
});

describe("allowanceLine", () => {
  it("words each case once", () => {
    expect(
      allowanceLine({
        kind: "trial",
        limitSeconds: 600,
        remainingSeconds: 437,
        resetsAt: null,
      }),
    ).toBe("7 of 10 free-trial voice minutes left");
    expect(
      allowanceLine({
        kind: "trial",
        limitSeconds: 600,
        remainingSeconds: 45,
        resetsAt: null,
      }),
    ).toBe("Under a minute of your 10 free-trial voice minutes left");
    expect(
      allowanceLine(
        {
          kind: "monthly",
          limitSeconds: 3600,
          remainingSeconds: 3300,
          resetsAt: "2026-10-31T23:00:00.000Z",
        },
        "en-GB",
      ),
    ).toBe("55 of 60 voice minutes left this month · refills 1 Nov");
  });
});

describe("voiceLimitMessage", () => {
  it("points each plan at its next step", () => {
    expect(voiceLimitMessage({ kind: "trial", limitSeconds: 600 })).toMatch(
      /Subscribe for 60 minutes a month, or Askly Premium for 300/,
    );
    expect(
      voiceLimitMessage({
        kind: "monthly",
        tier: "standard",
        limitSeconds: 3600,
      }),
    ).toMatch(/upgrade to Askly Premium/);
    expect(
      voiceLimitMessage({
        kind: "monthly",
        tier: "premium",
        limitSeconds: 18000,
      }),
    ).toBe(
      "You've used your 300 voice minutes for this month. They refill on the 1st.",
    );
  });
});

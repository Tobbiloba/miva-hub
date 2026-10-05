import { describe, expect, it } from "vitest";
import {
  STUDENT_TRIAL_DAYS,
  parseTrialDays,
  decideSignupAssignment,
  needsDomainResolution,
} from "./signup-policy";

const now = new Date("2026-10-04T12:00:00Z");
const trialEnd = new Date(
  now.getTime() + STUDENT_TRIAL_DAYS * 24 * 60 * 60 * 1000,
);

describe("needsDomainResolution", () => {
  it("always resolves for external requests", () => {
    expect(needsDomainResolution("external", undefined)).toBe(true);
  });
  it("resolves for provisioning without an explicit tenant", () => {
    expect(needsDomainResolution("provisioned", { role: "student" })).toBe(
      true,
    );
    expect(needsDomainResolution("provisioned", { universityId: "u1" })).toBe(
      false,
    );
    expect(needsDomainResolution("provisioned", { universityId: null })).toBe(
      false,
    );
  });
  it("never resolves for legacy server calls", () => {
    expect(needsDomainResolution("server", undefined)).toBe(false);
  });
});

describe("decideSignupAssignment", () => {
  it("rejects external sign-up from an unknown domain", () => {
    const d = decideSignupAssignment({
      source: "external",
      resolvedUniversityId: null,
      now,
    });
    expect(d.kind).toBe("reject");
  });

  it("assigns external sign-up to the domain's university as a trial student", () => {
    const d = decideSignupAssignment({
      source: "external",
      resolvedUniversityId: "uni-1",
      now,
    });
    expect(d).toEqual({
      kind: "assign",
      data: {
        universityId: "uni-1",
        role: "student",
        enrollmentStatus: "active",
        trialStartedAt: now,
        trialEndsAt: trialEnd,
      },
    });
  });

  it("ignores any assignment for external requests (no self-chosen role/tenant)", () => {
    const d = decideSignupAssignment({
      source: "external",
      assignment: { universityId: "other", role: "admin" },
      resolvedUniversityId: "uni-1",
      now,
    });
    expect(d.kind === "assign" && d.data.role).toBe("student");
    expect(d.kind === "assign" && d.data.universityId).toBe("uni-1");
  });

  it("gates provisioned sign-up without explicit tenant by domain", () => {
    expect(
      decideSignupAssignment({
        source: "provisioned",
        assignment: { role: "student" },
        resolvedUniversityId: null,
        now,
      }).kind,
    ).toBe("reject");
    const ok = decideSignupAssignment({
      source: "provisioned",
      assignment: { role: "student" },
      resolvedUniversityId: "uni-1",
      now,
    });
    expect(ok.kind === "assign" && ok.data.universityId).toBe("uni-1");
  });

  it("trusts an explicit tenant + role from server provisioning", () => {
    const d = decideSignupAssignment({
      source: "provisioned",
      assignment: { universityId: "uni-2", role: "faculty" },
      now,
    });
    expect(d).toEqual({
      kind: "assign",
      data: {
        universityId: "uni-2",
        role: "faculty",
        enrollmentStatus: "active",
      },
    });
  });

  it("allows an explicit null tenant (super_admin provisioning)", () => {
    const d = decideSignupAssignment({
      source: "provisioned",
      assignment: { universityId: null, role: "admin" },
      now,
    });
    expect(d.kind === "assign" && d.data.universityId).toBeNull();
  });

  it("gives provisioned students a trial and honours enrollmentStatus", () => {
    const d = decideSignupAssignment({
      source: "provisioned",
      assignment: {
        universityId: "uni-2",
        role: "student",
        enrollmentStatus: "inactive",
      },
      now,
    });
    expect(d).toEqual({
      kind: "assign",
      data: {
        universityId: "uni-2",
        role: "student",
        enrollmentStatus: "inactive",
        trialStartedAt: now,
        trialEndsAt: trialEnd,
      },
    });
  });

  it("passes legacy server-side calls through untouched", () => {
    expect(decideSignupAssignment({ source: "server", now })).toEqual({
      kind: "passthrough",
    });
  });
});

describe("parseTrialDays", () => {
  it("uses a valid override and falls back to 7 otherwise", () => {
    expect(parseTrialDays("30")).toBe(30);
    expect(parseTrialDays(undefined)).toBe(7);
    expect(parseTrialDays("")).toBe(7);
    expect(parseTrialDays("0")).toBe(7);
    expect(parseTrialDays("2.5")).toBe(7);
    expect(parseTrialDays("1000")).toBe(7);
  });
});

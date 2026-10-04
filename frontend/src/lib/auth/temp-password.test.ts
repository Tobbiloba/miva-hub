import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./temp-password";

describe("generateTempPassword", () => {
  it("defaults to 16 chars from the unambiguous alphabet", () => {
    const pw = generateTempPassword();
    expect(pw).toHaveLength(16);
    expect(pw).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
  });
  it("honours a custom length", () => {
    expect(generateTempPassword(24)).toHaveLength(24);
  });
  it("does not repeat", () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => generateTempPassword()),
    );
    expect(seen.size).toBe(200);
  });
});

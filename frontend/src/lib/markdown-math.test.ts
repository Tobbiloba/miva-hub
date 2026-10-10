import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters } from "./markdown-math";

describe("normalizeMathDelimiters", () => {
  it("turns \\[ \\] into display math and \\( \\) into inline math", () => {
    const out = normalizeMathDelimiters(
      "Given \\[ 2x^2 - 8x + 6 = 0 \\] so \\( x = 3 \\) or \\(x=1\\).",
    );
    expect(out).toContain("\n$$\n2x^2 - 8x + 6 = 0\n$$\n");
    expect(out).toContain("$x = 3$");
    expect(out).toContain("$x=1$");
  });

  it("leaves code alone", () => {
    const src = "Use `\\(x\\)` or\n```\n\\[ y \\]\n```\n";
    expect(normalizeMathDelimiters(src)).toBe(src);
  });

  it("is a no-op without LaTeX delimiters", () => {
    expect(normalizeMathDelimiters("costs ₦3,000 [S1]")).toBe(
      "costs ₦3,000 [S1]",
    );
  });
});

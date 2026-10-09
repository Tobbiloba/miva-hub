import { describe, expect, it } from "vitest";
import {
  type CitationSource,
  citationSourcesBefore,
  linkCitations,
  stripCitationMarkers,
} from "./citations";

const s1: CitationSource = {
  source: "S1",
  title: 'Week 1 "History"',
  course: "COS101",
  week: 1,
  materialId: "11111111-1111-1111-1111-111111111111",
};
const s2: CitationSource = { ...s1, source: "S2", week: null, materialId: "2" };
const sources = new Map([
  ["S1", s1],
  ["S2", s2],
]);

describe("linkCitations", () => {
  it("links single and grouped markers and reports what was cited", () => {
    const { text, cited } = linkCitations(
      "Vacuum tubes came first [S1]. Then transistors [S1, S2].",
      sources,
    );
    expect(text).toContain(
      `[S1](/student/lecture-study/${s1.materialId}?cite=S1 "Week 1 'History' · COS101 · Week 1")`,
    );
    expect(text).toContain("[S2](/student/lecture-study/2?cite=S2");
    expect(cited.map((c) => c.source)).toEqual(["S1", "S2"]);
  });

  it("leaves unknown markers and existing links alone", () => {
    const input = "See [S9] and [S1](https://example.com).";
    expect(linkCitations(input, sources).text).toBe(input);
  });

  it("does nothing without sources", () => {
    expect(linkCitations("[S1]", new Map()).text).toBe("[S1]");
  });
});

describe("citationSourcesBefore", () => {
  const search = (passages: unknown[]) => ({
    type: "tool-search-course-materials",
    toolCallId: "t",
    state: "output-available",
    input: {},
    output: { passages },
  });

  it("uses the most recent search before the text", () => {
    const parts = [
      search([{ ...s1, materialId: "old" }]),
      { type: "text", text: "first" },
      search([s1]),
      { type: "text", text: "second" },
    ] as any;
    expect(citationSourcesBefore(parts, 1).get("S1")?.materialId).toBe("old");
    expect(citationSourcesBefore(parts, 3).get("S1")?.materialId).toBe(
      s1.materialId,
    );
    expect(citationSourcesBefore(parts, 0).size).toBe(0);
  });
});

describe("stripCitationMarkers", () => {
  it("drops single and grouped markers and tidies the spacing", () => {
    expect(
      stripCitationMarkers(
        "Hardware and software (system and application). [S1]",
      ),
    ).toBe("Hardware and software (system and application).");
    expect(
      stripCitationMarkers("Transistors [S1, S2] replaced tubes [S3]."),
    ).toBe("Transistors replaced tubes.");
    expect(stripCitationMarkers("No markers here")).toBe("No markers here");
  });
});

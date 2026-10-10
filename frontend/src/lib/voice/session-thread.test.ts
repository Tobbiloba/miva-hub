import { describe, expect, it } from "vitest";
import { voiceSessionMessages, voiceThreadTitle } from "./session-thread";

const startedAt = new Date("2026-10-10T10:00:00Z");
const text = (m: { parts: unknown[] }) => (m.parts[0] as { text: string }).text;

describe("voiceThreadTitle", () => {
  it("names the mode, course and topic", () => {
    expect(
      voiceThreadTitle({ mode: "tutor", courseCode: "COS101", focusTopic: "" }),
    ).toBe("Voice tutor: COS101");
    expect(
      voiceThreadTitle({
        mode: "viva",
        courseCode: "MTH101",
        focusTopic: " Quadratics ",
      }),
    ).toBe("Mock viva: MTH101 · Quadratics");
  });
});

describe("voiceSessionMessages", () => {
  it("maps speakers to roles, merges runs, drops empties and ends with a wrap-up", () => {
    const messages = voiceSessionMessages({
      threadId: "t1",
      mode: "tutor",
      courseCode: "COS101",
      focusTopic: null,
      rubric: null,
      startedAt,
      transcript: [
        { role: "examiner", text: "Hi Ada." },
        { role: "examiner", text: "What shall we cover?" },
        { role: "student", text: "  " },
        { role: "student", text: "Recursion." },
      ],
    });
    expect(messages.map((m) => m.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(text(messages[0])).toBe("Hi Ada. What shall we cover?");
    expect(text(messages[2])).toContain("keep going here by text");
    expect(messages.every((m) => m.threadId === "t1")).toBe(true);
    // Order survives the createdAt sort
    expect(messages.map((m) => m.createdAt.getTime())).toEqual([
      startedAt.getTime(),
      startedAt.getTime() + 1,
      startedAt.getTime() + 2,
    ]);
  });

  it("ends a graded viva with its rubric", () => {
    const messages = voiceSessionMessages({
      threadId: "t2",
      mode: "viva",
      courseCode: "COS101",
      focusTopic: null,
      startedAt,
      transcript: [
        { role: "examiner", text: "Define an algorithm." },
        { role: "student", text: "A finite set of steps." },
      ],
      rubric: {
        criteria: [
          {
            name: "accuracy",
            score: 14,
            comment: "Correct | but brief",
          },
        ] as never,
        overallScore: 62,
        verdict: "pass",
        strengths: ["Clear definition"],
        improvements: ["Give an example"],
        summary: "A solid start.",
      },
    });
    const last = text(messages.at(-1)!);
    expect(messages.at(-1)!.role).toBe("assistant");
    expect(last).toContain("Mock viva result: Pass · 62/100");
    expect(last).toContain("- Give an example");
    // A pipe in a comment can't break the table
    expect(last).toContain("| Accuracy | 14/20 | Correct / but brief |");
  });
});

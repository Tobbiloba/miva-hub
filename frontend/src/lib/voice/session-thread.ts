import type { VivaRubric, VivaTurn, VoiceMode } from "@/lib/ai/viva";
import type { ChatMessage } from "app-types/chat";
import { generateUUID } from "lib/utils";

/**
 * A finished voice session becomes an ordinary chat thread, so it shows in
 * the student's history and they can keep going by text ("make flashcards
 * from my weak spots"). Tutor/examiner turns become assistant messages and
 * the student's turns become user messages.
 */

type SessionInfo = {
  mode: VoiceMode;
  courseCode: string;
  focusTopic: string | null;
};

const CRITERION_LABELS: Record<string, string> = {
  conceptual_understanding: "Conceptual understanding",
  accuracy: "Accuracy",
  depth_of_reasoning: "Depth of reasoning",
  communication: "Communication",
  responsiveness_to_probing: "Responsiveness to probing",
};

export function voiceThreadTitle({
  mode,
  courseCode,
  focusTopic,
}: SessionInfo): string {
  const kind = mode === "viva" ? "Mock viva" : "Voice tutor";
  const topic = focusTopic?.trim();
  const title = topic
    ? `${kind}: ${courseCode} · ${topic}`
    : `${kind}: ${courseCode}`;
  return title.length > 120 ? `${title.slice(0, 119)}…` : title;
}

function rubricMarkdown(rubric: VivaRubric): string {
  const verdict =
    rubric.verdict.charAt(0).toUpperCase() + rubric.verdict.slice(1);
  return [
    `**Mock viva result: ${verdict} · ${rubric.overallScore}/100**`,
    "",
    rubric.summary,
    "",
    "**What went well**",
    ...rubric.strengths.map((s) => `- ${s}`),
    "",
    "**Revise this**",
    ...rubric.improvements.map((s) => `- ${s}`),
    "",
    "| Criterion | Score | Comment |",
    "| --- | --- | --- |",
    ...rubric.criteria.map(
      (c) =>
        `| ${CRITERION_LABELS[c.name] ?? c.name} | ${c.score}/20 | ${c.comment.replace(/\|/g, "/").replace(/\n/g, " ")} |`,
    ),
    "",
    "Want flashcards on the points to revise, or another practice question on them? Just ask.",
  ].join("\n");
}

const TUTOR_WRAP_UP =
  "That's the end of our voice session. You can keep going here by text: ask me to explain something again, quiz you, or make flashcards from the parts you found hard.";

/**
 * The thread's messages in spoken order. Consecutive turns by the same
 * speaker are merged, empty turns dropped, and the thread always ends with
 * an assistant message (the rubric or a wrap-up) so a text follow-up reads
 * as the student's turn. createdAt steps by 1ms from `startedAt` so the
 * order survives the thread's createdAt sort.
 */
export function voiceSessionMessages(
  input: SessionInfo & {
    threadId: string;
    transcript: VivaTurn[];
    rubric: VivaRubric | null;
    startedAt: Date;
  },
): ChatMessage[] {
  const merged: { role: "user" | "assistant"; text: string }[] = [];
  for (const turn of input.transcript) {
    const text = turn.text.trim();
    if (!text) continue;
    const role = turn.role === "student" ? "user" : "assistant";
    const last = merged.at(-1);
    if (last?.role === role) last.text = `${last.text} ${text}`;
    else merged.push({ role, text });
  }
  merged.push({
    role: "assistant",
    text:
      input.mode === "viva" && input.rubric
        ? rubricMarkdown(input.rubric)
        : TUTOR_WRAP_UP,
  });

  const base = input.startedAt.getTime();
  return merged.map((m, i) => ({
    id: generateUUID(),
    threadId: input.threadId,
    role: m.role,
    parts: [{ type: "text", text: m.text }],
    createdAt: new Date(base + i),
  }));
}

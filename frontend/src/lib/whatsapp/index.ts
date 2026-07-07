import "server-only";

import { generateText } from "ai";
import { and, eq, gt, isNotNull } from "drizzle-orm";

import { buildCourseTutorContext } from "@/lib/ai/course-tutor-context";
import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { customModelProvider } from "@/lib/ai/models";
import { getUserUniversity } from "@/lib/tenant";
import { pgDb } from "lib/db/pg/db.pg";
import { WhatsAppLinkSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "WhatsApp: " });

const TUTOR_MODEL = "gemini-2.5-flash";
const GRAPH_API = "https://graph.facebook.com/v20.0";

export function whatsappConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/** Send a plain text message via the WhatsApp Business Cloud API. */
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          // WhatsApp caps text bodies at 4096 chars
          text: { body: body.slice(0, 4096) },
        }),
      },
    );
    if (!res.ok) {
      logger.warn(`send failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    logger.warn("send failed", error);
    return false;
  }
}

// ── Conversation brain ──────────────────────────────────────────────────────

const HELP_TEXT = [
  "Askly on WhatsApp 📚",
  "",
  "COURSES — list your enrolled courses",
  "USE <number> — pick the course to study",
  "Anything else — ask your course tutor a question",
  "",
  "Answers are kept short to save your data.",
].join("\n");

/**
 * Handle one inbound WhatsApp text message and reply.
 * Identity is resolved from the verified phone link — never from message
 * content. Unlinked numbers can only run "LINK <code>".
 */
export async function handleInboundMessage(
  from: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  const upper = trimmed.toUpperCase();

  // LINK <code> — bind this phone to the account that generated the code.
  if (upper.startsWith("LINK")) {
    const code = trimmed.split(/\s+/)[1]?.toUpperCase();
    if (!code) {
      await sendWhatsAppText(from, "Usage: LINK <code from the Askly web app>");
      return;
    }
    const [link] = await pgDb
      .select({ id: WhatsAppLinkSchema.id })
      .from(WhatsAppLinkSchema)
      .where(
        and(
          eq(WhatsAppLinkSchema.verifyCode, code),
          gt(WhatsAppLinkSchema.verifyCodeExpiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!link) {
      await sendWhatsAppText(
        from,
        "That code is invalid or expired. Generate a new one in the Askly web app.",
      );
      return;
    }
    await pgDb
      .update(WhatsAppLinkSchema)
      .set({
        phoneNumber: from,
        verifiedAt: new Date(),
        verifyCode: null,
        verifyCodeExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(WhatsAppLinkSchema.id, link.id));
    await sendWhatsAppText(
      from,
      `Linked ✅ Your WhatsApp is now connected to Askly.\n\n${HELP_TEXT}`,
    );
    return;
  }

  // Everything else requires a verified link.
  const [link] = await pgDb
    .select()
    .from(WhatsAppLinkSchema)
    .where(
      and(
        eq(WhatsAppLinkSchema.phoneNumber, from),
        isNotNull(WhatsAppLinkSchema.verifiedAt),
      ),
    )
    .limit(1);
  if (!link) {
    await sendWhatsAppText(
      from,
      "This number is not linked to an Askly account. Open the Askly web app → WhatsApp, then send: LINK <your code>",
    );
    return;
  }

  const { pgAcademicRepository } = await import(
    "@/lib/db/pg/repositories/academic-repository.pg"
  );

  if (upper === "COURSES" || upper === "HELP" || upper === "MENU") {
    const courses = await pgAcademicRepository.getStudentCourses(link.userId);
    if (upper !== "COURSES") {
      await sendWhatsAppText(from, HELP_TEXT);
      return;
    }
    if (courses.length === 0) {
      await sendWhatsAppText(from, "You are not enrolled in any courses yet.");
      return;
    }
    const list = courses
      .map(
        ({ course }, i) => `${i + 1}. ${course.courseCode} — ${course.title}`,
      )
      .join("\n");
    await sendWhatsAppText(
      from,
      `Your courses:\n${list}\n\nReply USE <number> to pick one.`,
    );
    return;
  }

  if (upper.startsWith("USE")) {
    const n = parseInt(trimmed.split(/\s+/)[1] ?? "", 10);
    const courses = await pgAcademicRepository.getStudentCourses(link.userId);
    const picked = Number.isInteger(n) ? courses[n - 1] : undefined;
    if (!picked) {
      await sendWhatsAppText(
        from,
        "Course number not found. Send COURSES to see the list.",
      );
      return;
    }
    await pgDb
      .update(WhatsAppLinkSchema)
      .set({ activeCourseId: picked.course.id, updatedAt: new Date() })
      .where(eq(WhatsAppLinkSchema.id, link.id));
    await sendWhatsAppText(
      from,
      `Studying ${picked.course.courseCode} — ${picked.course.title}. Ask me anything about it!`,
    );
    return;
  }

  // Free text → course tutor answer.
  if (!link.activeCourseId) {
    await sendWhatsAppText(
      from,
      "Pick a course first: send COURSES, then USE <number>.",
    );
    return;
  }
  const context = await buildCourseTutorContext(
    link.userId,
    link.activeCourseId,
  );
  if (!context) {
    await sendWhatsAppText(
      from,
      "You are no longer enrolled in that course. Send COURSES to pick another.",
    );
    return;
  }

  try {
    const model = await customModelProvider.getModel({
      provider: "google",
      model: TUTOR_MODEL,
    });
    const { text: answer } = await generateText({
      model,
      maxOutputTokens: 1024,
      system: [
        `You are the Askly course tutor answering over WhatsApp for ${context.course.courseCode} — ${context.course.title}.`,
        "Answer ONLY from the course materials below, citing sources like [S1].",
        "If the materials do not cover it, say so plainly.",
        "This is WhatsApp on a low-bandwidth connection: keep answers under 150 words, plain text only — no markdown headings or tables.",
        "",
        context.contextText,
      ].join("\n"),
      prompt: trimmed.slice(0, 4000),
    });
    await sendWhatsAppText(from, answer);

    const university = await getUserUniversity(link.userId);
    await recordAIDecision({
      universityId: university?.id ?? null,
      decisionType: "tutoring",
      actor: "whatsapp-tutor",
      subjectType: "course",
      subjectId: link.activeCourseId,
      userId: link.userId,
      model: TUTOR_MODEL,
      inputSummary: `WhatsApp question (${context.course.courseCode}): ${trimmed.slice(0, 200)}`,
      decision: `action: answered over WhatsApp (${answer.length} chars)`,
      confidence: 1,
      status: "executed",
      metadata: { channel: "whatsapp" },
    }).catch((error) => logger.warn("ledger write failed", error));
  } catch (error) {
    logger.error("tutor answer failed", error);
    await sendWhatsAppText(
      from,
      "Sorry — I could not answer that right now. Please try again in a few minutes.",
    );
  }
}

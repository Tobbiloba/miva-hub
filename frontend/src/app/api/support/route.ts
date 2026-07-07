import { generateText, stepCountIs, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "auth/server";
import { recordAIDecision } from "lib/ai/decision-ledger";
import { customModelProvider } from "lib/ai/models";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Support API: " });

const SUPPORT_MODEL = "gemini-2.5-flash";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

/** Hardcoded platform FAQ — keyword-matched, no external data. */
const FAQ_ENTRIES = [
  {
    topic: "password reset",
    keywords: ["password", "reset", "forgot", "login", "sign in", "locked"],
    answer:
      "To reset your password, click 'Forgot password?' on the sign-in page and follow the email link. Reset links expire after 1 hour. If you don't receive the email, check spam or contact support.",
  },
  {
    topic: "enrollment",
    keywords: ["enroll", "enrollment", "register", "add course", "drop"],
    answer:
      "Course enrollment is managed by your university's registrar. You can view your current enrollments under Student > Courses. To add or drop a course, contact your department administrator — students cannot self-enroll on the platform.",
  },
  {
    topic: "billing and subscription",
    keywords: ["billing", "subscription", "payment", "pay", "plan", "upgrade", "invoice"],
    answer:
      "Your subscription status and payment history are available on the Billing page. Plans renew automatically at the end of each period. Payments are processed in NGN via our payment provider.",
  },
  {
    topic: "refunds",
    keywords: ["refund", "money back", "charge", "chargeback"],
    answer:
      "Refund requests must be handled by a human support agent and are reviewed case-by-case within 5 business days.",
  },
  {
    topic: "course materials access",
    keywords: ["material", "materials", "download", "pdf", "lecture", "video", "access"],
    answer:
      "Course materials are available under Student > Materials for courses you are actively enrolled in. If a material is missing, the instructor may not have published it yet. Some materials require an active subscription.",
  },
  {
    topic: "assignments and submissions",
    keywords: ["assignment", "submit", "submission", "deadline", "due", "late"],
    answer:
      "Assignments appear under Student > Assignments with their due dates. Late submission policies are set per-course by the instructor. Once graded, results appear under Grades.",
  },
  {
    topic: "grades and disputes",
    keywords: ["grade", "grading", "dispute", "regrade", "appeal", "mark"],
    answer:
      "Grades are visible under Student > Grades once released. Grade disputes cannot be resolved by AI support — they must be escalated to your instructor or a human administrator.",
  },
  {
    topic: "account deletion",
    keywords: ["delete account", "deactivate", "remove account", "close account"],
    answer:
      "Account deletion requires human review because it affects academic records. This request must be escalated to a human support agent.",
  },
];

const SYSTEM_PROMPT = `You are the Askly university platform support agent. You help signed-in students with questions about their enrollments, courses, upcoming assignments, subscription/billing status, and general platform usage.

Strict rules:
- Answer ONLY from tool results. Never invent enrollments, courses, dates, grades, or billing details.
- Use the tools to look up the student's own data; you cannot see any other student's data.
- Use searchFAQ for general "how does the platform work" questions.
- If you are unsure, if tools return no relevant data, or if the request requires human action (refunds, grade disputes, account deletion, payment failures needing manual intervention, anything you cannot verify), call escalateToHuman with a concise summary — then tell the student a human will follow up.
- Be concise, friendly, and specific. Format dates in a human-readable way.`;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const universityId =
      (session.user as { universityId?: string | null }).universityId ?? null;

    const rateLimit = checkRateLimit(`support:${userId}`, 10, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { message, history = [] } = parsed.data;

    // Escalation state — set by the escalateToHuman tool closure.
    let escalated = false;
    let escalationDecisionId: string | null = null;
    const toolsUsed: string[] = [];

    // All tools close over the SESSION user id — the model never supplies
    // userId/universityId (tenant scoping from session only).
    const tools = {
      getMyEnrollments: tool({
        description:
          "Get the signed-in student's enrollment summary: number of enrolled courses and total credits for the current academic year.",
        inputSchema: z.object({}),
        execute: async () => {
          toolsUsed.push("getMyEnrollments");
          return pgAcademicRepository.getStudentEnrollmentStats(userId);
        },
      }),
      getMyCourses: tool({
        description:
          "List the signed-in student's currently enrolled courses with course code, title, credits, semester, and department.",
        inputSchema: z.object({}),
        execute: async () => {
          toolsUsed.push("getMyCourses");
          const rows = await pgAcademicRepository.getStudentCourses(userId);
          return rows.map((r) => ({
            courseCode: r.course.courseCode,
            title: r.course.title,
            credits: r.course.credits,
            semester: r.enrollment.semester,
            academicYear: r.enrollment.academicYear,
            department: r.department.name,
            status: r.enrollment.status,
          }));
        },
      }),
      getMyUpcomingAssignments: tool({
        description:
          "List the signed-in student's upcoming (not yet due) published assignments with due dates and whether a submission exists.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20).optional().describe("Max results, default 10"),
        }),
        execute: async ({ limit }) => {
          toolsUsed.push("getMyUpcomingAssignments");
          const rows = await pgAcademicRepository.getStudentUpcomingAssignments(
            userId,
            limit ?? 10,
          );
          return rows.map((r) => ({
            title: r.assignment.title,
            course: r.course.courseCode,
            dueDate: r.assignment.dueDate,
            totalPoints: r.assignment.totalPoints,
            submitted: !!r.submission,
          }));
        },
      }),
      getMySubscriptionStatus: tool({
        description:
          "Get the signed-in student's subscription/billing status: active subscription, plan name, period dates, and cancellation state.",
        inputSchema: z.object({}),
        execute: async () => {
          toolsUsed.push("getMySubscriptionStatus");
          const subscription =
            await subscriptionRepository.getUserActiveSubscription(userId);
          const planName = await subscriptionRepository.getUserPlan(userId);
          const planDetails = subscription
            ? await subscriptionRepository.getPlanById(subscription.planId)
            : null;
          return {
            plan: planDetails?.displayName ?? planName ?? "Free Plan",
            subscription: subscription
              ? {
                  status: subscription.status,
                  currentPeriodStart: subscription.currentPeriodStart,
                  currentPeriodEnd: subscription.currentPeriodEnd,
                  nextPaymentDate: subscription.nextPaymentDate,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                }
              : null,
          };
        },
      }),
      searchFAQ: tool({
        description:
          "Search the platform FAQ for general how-to questions (password reset, enrollment process, billing, materials access, assignments, grades, account deletion).",
        inputSchema: z.object({
          query: z.string().describe("Keywords to search the FAQ for"),
        }),
        execute: async ({ query }) => {
          toolsUsed.push("searchFAQ");
          const q = query.toLowerCase();
          const matches = FAQ_ENTRIES.filter(
            (e) =>
              e.keywords.some((k) => q.includes(k)) ||
              q.split(/\s+/).some((w) => w.length > 3 && e.topic.includes(w)),
          );
          return matches.length > 0
            ? matches.map(({ topic, answer }) => ({ topic, answer }))
            : { found: false, note: "No FAQ entry matches this question." };
        },
      }),
      escalateToHuman: tool({
        description:
          "Escalate this support request to a human agent. Use when the request needs human action (refunds, grade disputes, account deletion) or when you cannot resolve it from tool results.",
        inputSchema: z.object({
          summary: z
            .string()
            .describe("Concise summary of the issue for the human agent"),
          reason: z.string().describe("Why this needs a human"),
        }),
        execute: async ({ summary, reason }) => {
          toolsUsed.push("escalateToHuman");
          escalated = true;
          escalationDecisionId = await recordAIDecision({
            universityId,
            decisionType: "support",
            actor: "support-agent",
            userId,
            model: SUPPORT_MODEL,
            inputSummary: message,
            decision: `escalated: ${summary}`.slice(0, 200),
            reasoning: reason,
            confidence: 0.5,
            status: "pending_review",
            metadata: { toolsUsed, escalation: true },
          });
          return {
            escalated: true,
            note: "A human support agent has been notified and will follow up.",
          };
        },
      }),
    };

    const model = await customModelProvider.getModel({
      provider: "google",
      model: SUPPORT_MODEL,
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user" as const, content: message }],
      tools,
      stopWhen: stepCountIs(6),
    });

    const reply =
      result.text ||
      (escalated
        ? "I've escalated your request to a human support agent — they'll follow up with you shortly."
        : "Sorry, I couldn't produce an answer. Please try rephrasing your question.");

    let decisionId: string | null = escalationDecisionId;
    if (!escalated) {
      const usedDataTools = toolsUsed.length > 0;
      decisionId = await recordAIDecision({
        universityId,
        decisionType: "support",
        actor: "support-agent",
        userId,
        model: SUPPORT_MODEL,
        inputSummary: message,
        decision: reply.slice(0, 200),
        confidence: usedDataTools ? 0.9 : 0.6,
        status: "executed",
        metadata: { toolsUsed },
      });
    }

    return NextResponse.json({ reply, escalated, decisionId });
  } catch (error) {
    logger.error("support request failed", error);
    return NextResponse.json(
      { error: "Failed to process support request" },
      { status: 500 },
    );
  }
}

import { generateText, stepCountIs, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPasswordResetEmail } from "@/lib/auth/password-reset";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { cancelSubscriptionForUser } from "@/lib/payment/cancel-subscription";
import { getSession } from "auth/server";
import { recordAIDecision } from "lib/ai/decision-ledger";
import { customModelProvider } from "lib/ai/models";
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
    keywords: [
      "billing",
      "subscription",
      "payment",
      "pay",
      "plan",
      "upgrade",
      "invoice",
    ],
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
    keywords: [
      "material",
      "materials",
      "download",
      "pdf",
      "lecture",
      "video",
      "access",
    ],
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
    keywords: [
      "delete account",
      "deactivate",
      "remove account",
      "close account",
    ],
    answer:
      "Account deletion requires human review because it affects academic records. This request must be escalated to a human support agent.",
  },
];

const SYSTEM_PROMPT = `You are the Askly university platform support agent. You help signed-in students with questions about their enrollments, courses, upcoming assignments, subscription/billing status, and general platform usage.

Strict rules:
- Answer ONLY from tool results. Never invent enrollments, courses, dates, grades, or billing details.
- Use the tools to look up the student's own data; you cannot see any other student's data.
- Use searchFAQ for general "how does the platform work" questions.

You can also take REAL actions on the student's behalf:
- sendPasswordResetLink — sends a password reset link to the student's own email. Use it immediately when they say they forgot their password or can't log in; it needs no confirmation.
- cancelMySubscriptionAtPeriodEnd — cancels the student's subscription at the end of the current billing period. This is a real billing action: FIRST check their subscription with getMySubscriptionStatus and tell them what they'd be cancelling and until when access lasts, THEN ask them to explicitly confirm, and only call this tool with confirmed=true after they clearly say yes in this conversation. Never cancel immediately/mid-period — that path is human-only.

- If you are unsure, if tools return no relevant data, or if the request requires human action (refunds, immediate cancellation, grade disputes, account deletion, payment failures needing manual intervention, anything you cannot verify), call escalateToHuman with a concise summary — then tell the student a human will follow up.
- Be concise, friendly, and specific. Format dates in a human-readable way.`;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email;
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
    // Real actions the agent executed this turn — each also gets its own
    // ledger row, so the audit trail shows every lever pulled.
    const actionsTaken: string[] = [];

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
          limit: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe("Max results, default 10"),
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
      sendPasswordResetLink: tool({
        description:
          "Send a password reset link to the signed-in student's own email address. Resolves 'forgot password' / 'can't log in' tickets directly. No confirmation needed.",
        inputSchema: z.object({}),
        execute: async () => {
          toolsUsed.push("sendPasswordResetLink");
          const result = await sendPasswordResetEmail(userEmail);
          actionsTaken.push("password_reset_link_sent");
          await recordAIDecision({
            universityId,
            decisionType: "support",
            actor: "support-agent",
            subjectType: "password_reset",
            userId,
            model: SUPPORT_MODEL,
            inputSummary: message,
            decision: "action: sent password reset link to student's email",
            reasoning:
              "Student requested help accessing their account; reset link resolves it without human involvement.",
            confidence: 1,
            status: "executed",
            metadata: {
              action: "sendPasswordResetLink",
              emailSent: result.sent,
            },
          });
          return {
            done: true,
            note: `A password reset link has been sent to ${userEmail}. It expires in 1 hour.`,
          };
        },
      }),
      cancelMySubscriptionAtPeriodEnd: tool({
        description:
          "Cancel the signed-in student's subscription at the END of the current billing period (access continues until then). REAL billing action — only call with confirmed=true after the student has explicitly confirmed in this conversation.",
        inputSchema: z.object({
          confirmed: z
            .boolean()
            .describe(
              "Must be true, and only after the student explicitly confirmed the cancellation in this conversation",
            ),
        }),
        execute: async ({ confirmed }) => {
          toolsUsed.push("cancelMySubscriptionAtPeriodEnd");
          if (!confirmed) {
            return {
              done: false,
              note: "Not cancelled. Ask the student to explicitly confirm before calling this tool with confirmed=true.",
            };
          }
          const result = await cancelSubscriptionForUser(userId, {
            immediate: false,
            reason: "Cancelled at period end via AI support agent",
          });
          if (result.ok) {
            actionsTaken.push("subscription_cancelled_at_period_end");
          }
          await recordAIDecision({
            universityId,
            decisionType: "support",
            actor: "support-agent",
            subjectType: "subscription_cancellation",
            userId,
            model: SUPPORT_MODEL,
            inputSummary: message,
            decision: result.ok
              ? "action: cancelled subscription at period end (student confirmed)"
              : `action failed: ${result.message}`,
            reasoning:
              "Student explicitly requested and confirmed cancellation at period end.",
            confidence: 1,
            status: "executed",
            metadata: {
              action: "cancelMySubscriptionAtPeriodEnd",
              ok: result.ok,
              detail: result.message,
            },
          });
          return { done: result.ok, note: result.message };
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
            metadata: { toolsUsed, actionsTaken, escalation: true },
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
        metadata: { toolsUsed, actionsTaken },
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

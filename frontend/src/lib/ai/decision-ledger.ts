import "server-only";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { AIDecisionSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({
  message: "AI Decision Ledger: ",
});

export type DecisionType =
  | "grading"
  | "support"
  | "admissions"
  | "tutoring"
  | "content"
  | "operations";

export type DecisionStatus =
  | "executed"
  | "pending_review"
  | "approved"
  | "overridden"
  | "rejected";

export interface RecordDecisionInput {
  universityId?: string | null;
  decisionType: DecisionType;
  /** Which agent made the decision, e.g. "grading-agent" */
  actor: string;
  subjectType?: string;
  subjectId?: string;
  /** The user affected (student/applicant), if any */
  userId?: string | null;
  model: string;
  inputSummary?: string;
  /** The outcome, e.g. "grade: 78/100" */
  decision: string;
  reasoning?: string;
  /** 0..1 */
  confidence?: number;
  status?: DecisionStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Record an AI decision. Never throws — a ledger failure must not break the
 * user-facing flow it observes. Returns the ledger row id, or null on failure.
 */
export async function recordAIDecision(
  input: RecordDecisionInput,
): Promise<string | null> {
  try {
    const [row] = await pgDb
      .insert(AIDecisionSchema)
      .values({
        universityId: input.universityId ?? null,
        decisionType: input.decisionType,
        actor: input.actor,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        userId: input.userId ?? null,
        model: input.model,
        inputSummary: input.inputSummary?.slice(0, 2000),
        decision: input.decision,
        reasoning: input.reasoning?.slice(0, 4000),
        confidence: input.confidence,
        status: input.status ?? "executed",
        metadata: input.metadata ?? {},
      })
      .returning({ id: AIDecisionSchema.id });
    return row?.id ?? null;
  } catch (error) {
    logger.error("failed to record decision", error);
    return null;
  }
}

/** Mark a pending decision as approved/overridden/rejected by a human. */
export async function reviewAIDecision(params: {
  decisionId: string;
  universityId: string;
  reviewedById: string;
  status: Extract<DecisionStatus, "approved" | "overridden" | "rejected">;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const result = await pgDb
      .update(AIDecisionSchema)
      .set({
        status: params.status,
        reviewedById: params.reviewedById,
        reviewedAt: new Date(),
        ...(params.metadata
          ? {
              // metadata column is json (not jsonb) — cast both sides to merge
              metadata: sql`((${AIDecisionSchema.metadata})::jsonb || ${JSON.stringify(params.metadata)}::jsonb)::json`,
            }
          : {}),
      })
      // Tenant-scoped: a reviewer can only review their university's decisions
      .where(
        and(
          eq(AIDecisionSchema.id, params.decisionId),
          eq(AIDecisionSchema.universityId, params.universityId),
        ),
      )
      .returning({ id: AIDecisionSchema.id });
    return result.length > 0;
  } catch (error) {
    logger.error("failed to review decision", error);
    return false;
  }
}

export interface LedgerQuery {
  universityId: string;
  decisionType?: DecisionType;
  status?: DecisionStatus;
  sinceDays?: number;
  limit?: number;
  offset?: number;
}

export async function listAIDecisions(query: LedgerQuery) {
  const conditions = [eq(AIDecisionSchema.universityId, query.universityId)];
  if (query.decisionType)
    conditions.push(eq(AIDecisionSchema.decisionType, query.decisionType));
  if (query.status) conditions.push(eq(AIDecisionSchema.status, query.status));
  if (query.sinceDays)
    conditions.push(
      gte(
        AIDecisionSchema.createdAt,
        new Date(Date.now() - query.sinceDays * 24 * 60 * 60 * 1000),
      ),
    );

  return pgDb
    .select()
    .from(AIDecisionSchema)
    .where(and(...conditions))
    .orderBy(desc(AIDecisionSchema.createdAt))
    .limit(Math.min(query.limit ?? 50, 200))
    .offset(query.offset ?? 0);
}

/** Aggregate stats for the operations dashboard — tenant-scoped. */
export async function getAIDecisionStats(universityId: string, sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const base = and(
    eq(AIDecisionSchema.universityId, universityId),
    gte(AIDecisionSchema.createdAt, since),
  );

  const byType = await pgDb
    .select({
      decisionType: AIDecisionSchema.decisionType,
      status: AIDecisionSchema.status,
      count: count(),
      avgConfidence: sql<number>`avg(${AIDecisionSchema.confidence})`,
    })
    .from(AIDecisionSchema)
    .where(base)
    .groupBy(AIDecisionSchema.decisionType, AIDecisionSchema.status);

  const total = byType.reduce((acc, r) => acc + Number(r.count), 0);
  const overridden = byType
    .filter((r) => r.status === "overridden" || r.status === "rejected")
    .reduce((acc, r) => acc + Number(r.count), 0);

  return {
    sinceDays,
    total,
    overridden,
    overrideRate: total > 0 ? overridden / total : 0,
    byType,
  };
}

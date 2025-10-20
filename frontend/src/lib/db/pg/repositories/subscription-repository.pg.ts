import { pgDb as db } from "../db.pg";
import {
  SubscriptionPlanSchema,
  UserSubscriptionSchema,
  UsageTrackingSchema,
  PaymentTransactionSchema,
  SubscriptionChangeLogSchema,
  WebhookEventSchema,
} from "../schema.pg";
import { eq, and, gte, sql, desc } from "drizzle-orm";

export class SubscriptionRepository {
  async getAllPlans() {
    return await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.isActive, true));
  }

  async getPlanByName(name: string) {
    const [plan] = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.name, name));
    return plan;
  }

  async getPlanById(id: string) {
    const [plan] = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.id, id));
    return plan;
  }

  async getUserActiveSubscription(userId: string) {
    const [subscription] = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(
        and(
          eq(UserSubscriptionSchema.userId, userId),
          eq(UserSubscriptionSchema.status, "active"),
          gte(UserSubscriptionSchema.currentPeriodEnd, new Date())
        )
      )
      .limit(1);
    return subscription;
  }

  async createSubscription(data: {
    userId: string;
    planId: string;
    paystackSubscriptionCode: string;
    paystackCustomerCode: string;
    paystackAuthorizationCode: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentDate: Date;
  }) {
    const [subscription] = await db
      .insert(UserSubscriptionSchema)
      .values({
        ...data,
        status: "active",
      })
      .returning();
    return subscription;
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<typeof UserSubscriptionSchema.$inferInsert>
  ) {
    const [updated] = await db
      .update(UserSubscriptionSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(UserSubscriptionSchema.id, subscriptionId))
      .returning();
    return updated;
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    const updates: any = {
      cancelAtPeriodEnd,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };

    if (!cancelAtPeriodEnd) {
      updates.status = "cancelled";
    }

    const [cancelled] = await db
      .update(UserSubscriptionSchema)
      .set(updates)
      .where(eq(UserSubscriptionSchema.id, subscriptionId))
      .returning();
    return cancelled;
  }

  async checkUsageLimit(
    userId: string,
    usageType: string,
    periodType: "daily" | "weekly" | "monthly" = "daily"
  ) {
    const result = await db.execute(sql`
      SELECT check_usage_limit(${userId}, ${usageType}, ${periodType}) as usage_status
    `);
    return result.rows[0]?.usage_status;
  }

  async incrementUsage(
    userId: string,
    usageType: string,
    periodType: "daily" | "weekly" | "monthly" = "daily",
    increment = 1
  ) {
    const result = await db.execute(sql`
      SELECT increment_usage(${userId}, ${usageType}, ${periodType}, ${increment}) as success
    `);
    return result.rows[0]?.success;
  }

  async getUserUsage(userId: string, usageType: string, periodType: string) {
    const [usage] = await db
      .select()
      .from(UsageTrackingSchema)
      .where(
        and(
          eq(UsageTrackingSchema.userId, userId),
          eq(UsageTrackingSchema.usageType, usageType),
          eq(UsageTrackingSchema.periodType, periodType)
        )
      )
      .orderBy(desc(UsageTrackingSchema.periodStart))
      .limit(1);
    return usage;
  }

  async createTransaction(data: typeof PaymentTransactionSchema.$inferInsert) {
    const [transaction] = await db
      .insert(PaymentTransactionSchema)
      .values(data)
      .returning();
    return transaction;
  }

  async updateTransaction(
    reference: string,
    updates: Partial<typeof PaymentTransactionSchema.$inferInsert>
  ) {
    const [updated] = await db
      .update(PaymentTransactionSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTransactionSchema.paystackReference, reference))
      .returning();
    return updated;
  }

  async getTransactionByReference(reference: string) {
    const [transaction] = await db
      .select()
      .from(PaymentTransactionSchema)
      .where(eq(PaymentTransactionSchema.paystackReference, reference));
    return transaction;
  }

  async logSubscriptionChange(data: {
    userId: string;
    subscriptionId?: string;
    changeType: "upgrade" | "downgrade" | "cancel" | "reactivate" | "expire";
    fromPlanId?: string;
    toPlanId?: string;
    reason?: string;
  }) {
    const [log] = await db
      .insert(SubscriptionChangeLogSchema)
      .values(data)
      .returning();
    return log;
  }

  async getUserChangeLogs(userId: string, limit = 10) {
    return await db
      .select()
      .from(SubscriptionChangeLogSchema)
      .where(eq(SubscriptionChangeLogSchema.userId, userId))
      .orderBy(desc(SubscriptionChangeLogSchema.createdAt))
      .limit(limit);
  }

  async logWebhookEvent(data: {
    eventType: string;
    paystackEventId?: string;
    payload: Record<string, any>;
    signature?: string;
  }) {
    const [event] = await db
      .insert(WebhookEventSchema)
      .values(data)
      .returning();
    return event;
  }

  async markWebhookProcessed(eventId: string, success: boolean, errorMessage?: string) {
    const [updated] = await db
      .update(WebhookEventSchema)
      .set({
        processed: success,
        processedAt: new Date(),
        errorMessage,
      })
      .where(eq(WebhookEventSchema.id, eventId))
      .returning();
    return updated;
  }

  async getUserPlan(userId: string): Promise<string> {
    const result = await db.execute(sql`
      SELECT get_user_plan(${userId}) as plan_name
    `);
    return (result.rows[0]?.plan_name as string) || "FREE";
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT has_active_subscription(${userId}) as has_subscription
    `);
    return (result.rows[0]?.has_subscription as boolean) || false;
  }

  async getUserSubscriptionWithPlan(userId: string) {
    const [result] = await db
      .select({
        subscription: UserSubscriptionSchema,
        plan: SubscriptionPlanSchema,
      })
      .from(UserSubscriptionSchema)
      .innerJoin(
        SubscriptionPlanSchema,
        eq(UserSubscriptionSchema.planId, SubscriptionPlanSchema.id)
      )
      .where(eq(UserSubscriptionSchema.userId, userId))
      .orderBy(desc(UserSubscriptionSchema.createdAt))
      .limit(1);
    
    return result;
  }

  async getUserTransactionHistory(userId: string, limit = 20) {
    return await db
      .select()
      .from(PaymentTransactionSchema)
      .where(eq(PaymentTransactionSchema.userId, userId))
      .orderBy(desc(PaymentTransactionSchema.createdAt))
      .limit(limit);
  }
}

export const subscriptionRepository = new SubscriptionRepository();

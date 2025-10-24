import "server-only";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, gt } from "drizzle-orm";
import logger from "logger";

/**
 * Check if a user has an active subscription
 * @param userId - The user's ID
 * @returns Promise<boolean> - True if user has active subscription, false otherwise
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const now = new Date();

    const subscription = await pgDb
      .select()
      .from(UserSubscriptionSchema)
      .where(
        and(
          eq(UserSubscriptionSchema.userId, userId),
          eq(UserSubscriptionSchema.status, "active"),
          gt(UserSubscriptionSchema.currentPeriodEnd, now)
        )
      )
      .limit(1);

    const hasSubscription = subscription.length > 0;

    logger.info(`Subscription check for user ${userId}:`, {
      hasSubscription,
      expiresAt: subscription[0]?.currentPeriodEnd || null,
    });

    return hasSubscription;
  } catch (error) {
    logger.error(`Error checking subscription for user ${userId}:`, error);
    // Default to false on error (deny access if we can't verify)
    return false;
  }
}

/**
 * Get user's active subscription details
 * @param userId - The user's ID
 * @returns Promise with subscription object or null
 */
export async function getActiveSubscription(userId: string) {
  try {
    const now = new Date();

    const subscription = await pgDb
      .select()
      .from(UserSubscriptionSchema)
      .where(
        and(
          eq(UserSubscriptionSchema.userId, userId),
          eq(UserSubscriptionSchema.status, "active"),
          gt(UserSubscriptionSchema.currentPeriodEnd, now)
        )
      )
      .limit(1);

    return subscription[0] || null;
  } catch (error) {
    logger.error(`Error getting subscription for user ${userId}:`, error);
    return null;
  }
}

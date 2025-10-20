import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export interface UsageCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
  data?: {
    current?: number;
    limit?: number;
    plan?: string;
    upgradeUrl?: string;
    remaining?: number;
    resets_at?: string;
  };
}

export async function checkUsageLimit(
  req: NextRequest,
  usageType: string,
  periodType: "daily" | "weekly" | "monthly" = "daily"
): Promise<UsageCheckResult> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return {
        allowed: false,
        error: "Unauthorized",
        status: 401,
      };
    }

    const usageStatus = await subscriptionRepository.checkUsageLimit(
      session.user.id,
      usageType,
      periodType
    );

    if (!usageStatus.allowed) {
      const plan = await subscriptionRepository.getUserPlan(session.user.id);
      
      return {
        allowed: false,
        error: "Usage limit exceeded",
        status: 429,
        data: {
          current: usageStatus.current,
          limit: usageStatus.limit,
          remaining: usageStatus.remaining,
          resets_at: usageStatus.resets_at,
          plan,
          upgradeUrl: "/pricing",
        },
      };
    }

    return {
      allowed: true,
      data: usageStatus,
    };
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return {
      allowed: false,
      error: "Internal server error",
      status: 500,
    };
  }
}

export async function incrementUsageCount(
  userId: string,
  usageType: string,
  periodType: "daily" | "weekly" | "monthly" = "daily",
  increment = 1
): Promise<boolean> {
  try {
    const success = await subscriptionRepository.incrementUsage(
      userId,
      usageType,
      periodType,
      increment
    );
    return success || false;
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return false;
  }
}

export async function getUserUsageInfo(userId: string) {
  try {
    const plan = await subscriptionRepository.getUserPlan(userId);
    const hasActiveSubscription = await subscriptionRepository.hasActiveSubscription(userId);
    
    const aiMessages = await subscriptionRepository.checkUsageLimit(
      userId,
      "ai_messages_per_day",
      "daily"
    );
    
    const quizzes = await subscriptionRepository.checkUsageLimit(
      userId,
      "quizzes_per_week",
      "weekly"
    );
    
    const exams = await subscriptionRepository.checkUsageLimit(
      userId,
      "exams_per_month",
      "monthly"
    );

    return {
      plan,
      hasActiveSubscription,
      usage: {
        aiMessages,
        quizzes,
        exams,
      },
    };
  } catch (error) {
    console.error("Error getting user usage info:", error);
    return null;
  }
}

export const UsageTypes = {
  AI_MESSAGES: "ai_messages_per_day",
  QUIZZES: "quizzes_per_week",
  EXAMS: "exams_per_month",
  FLASHCARD_SETS: "flashcard_sets_per_week",
  PRACTICE_PROBLEMS: "practice_problems_per_week",
  STUDY_GUIDES: "study_guides_per_week",
  MATERIAL_SEARCHES: "material_searches_per_day",
} as const;

export const PeriodTypes = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

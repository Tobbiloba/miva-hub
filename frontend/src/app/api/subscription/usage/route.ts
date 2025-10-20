import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageTypes = [
      { type: "ai_messages_per_day", period: "daily", label: "AI Messages Today" },
      { type: "quizzes_per_week", period: "weekly", label: "Quizzes This Week" },
      { type: "exams_per_month", period: "monthly", label: "Exams This Month" },
      { type: "flashcard_sets_per_week", period: "weekly", label: "Flashcard Sets This Week" },
    ];

    const usageData = await Promise.all(
      usageTypes.map(async ({ type, period, label }) => {
        try {
          const usage = await subscriptionRepository.checkUsageLimit(
            session.user.id,
            type,
            period as any
          );
          
          return {
            label,
            type,
            period,
            current: (usage as any)?.current || 0,
            limit: (usage as any)?.limit || 0,
            allowed: (usage as any)?.allowed !== false,
          };
        } catch (error) {
          return {
            label,
            type,
            period,
            current: 0,
            limit: 0,
            allowed: true,
          };
        }
      })
    );

    return NextResponse.json({ usage: usageData });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}

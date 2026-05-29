import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const [result] = await pgDb
      .select({ count: count() })
      .from(NotificationSchema)
      .where(
        and(
          eq(NotificationSchema.studentId, session.user.id),
          eq(NotificationSchema.isRead, false),
        ),
      );

    return NextResponse.json({
      success: true,
      count: result?.count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, desc, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const studentId = session.user.id;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20"),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [eq(NotificationSchema.studentId, studentId)];
    if (unreadOnly) {
      conditions.push(eq(NotificationSchema.isRead, false));
    }

    const [notifications, [unreadCount]] = await Promise.all([
      pgDb
        .select()
        .from(NotificationSchema)
        .where(and(...conditions))
        .orderBy(desc(NotificationSchema.createdAt))
        .limit(limit)
        .offset(offset),
      pgDb
        .select({ count: count() })
        .from(NotificationSchema)
        .where(
          and(
            eq(NotificationSchema.studentId, studentId),
            eq(NotificationSchema.isRead, false),
          ),
        ),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: unreadCount?.count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

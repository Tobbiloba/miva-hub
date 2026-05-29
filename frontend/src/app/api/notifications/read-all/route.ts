import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await pgDb
      .update(NotificationSchema)
      .set({
        isRead: true,
        readAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(NotificationSchema.studentId, session.user.id),
          eq(NotificationSchema.isRead, false),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/read-all error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

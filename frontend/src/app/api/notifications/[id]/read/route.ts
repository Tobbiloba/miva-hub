import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const [updated] = await pgDb
      .update(NotificationSchema)
      .set({
        isRead: true,
        readAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(NotificationSchema.id, id),
          eq(NotificationSchema.studentId, session.user.id),
        ),
      )
      .returning({ id: NotificationSchema.id });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/[id]/read error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

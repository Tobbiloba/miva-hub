import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export async function DELETE(
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

    const [deleted] = await pgDb
      .delete(NotificationSchema)
      .where(
        and(
          eq(NotificationSchema.id, id),
          eq(NotificationSchema.studentId, session.user.id),
        ),
      )
      .returning({ id: NotificationSchema.id });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

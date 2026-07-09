import { requireFaculty } from "@/lib/auth/faculty";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema } from "@/lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { id } = await params;
    const body = await request.json();

    const [existing] = await pgDb
      .select()
      .from(AnnouncementSchema)
      .where(
        and(
          eq(AnnouncementSchema.id, id),
          eq(AnnouncementSchema.createdById, session.user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await pgDb
      .update(AnnouncementSchema)
      .set(updateData)
      .where(eq(AnnouncementSchema.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Announcement updated",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update announcement",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { id } = await params;

    const [existing] = await pgDb
      .select()
      .from(AnnouncementSchema)
      .where(
        and(
          eq(AnnouncementSchema.id, id),
          eq(AnnouncementSchema.createdById, session.user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    await pgDb.delete(AnnouncementSchema).where(eq(AnnouncementSchema.id, id));

    return NextResponse.json({
      success: true,
      message: "Announcement deleted",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete announcement",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

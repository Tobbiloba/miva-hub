import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = id;

    const announcement = await pgDb
      .select()
      .from(AnnouncementSchema)
      .where(eq(AnnouncementSchema.id, announcementId))
      .limit(1);

    if (announcement.length === 0) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement[0]
    });

  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch announcement" 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = id;
    const body = await request.json();
    const { 
      title, 
      content, 
      targetAudience,
      priority,
      courseId,
      departmentId,
      expiresAt,
      isActive 
    } = body;

    // Check if announcement exists
    const existingAnnouncement = await pgDb
      .select()
      .from(AnnouncementSchema)
      .where(eq(AnnouncementSchema.id, announcementId))
      .limit(1);

    if (existingAnnouncement.length === 0) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Update announcement
    const updatedAnnouncement = await pgDb
      .update(AnnouncementSchema)
      .set({
        title,
        content,
        targetAudience,
        priority,
        courseId: courseId || null,
        departmentId: departmentId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(AnnouncementSchema.id, announcementId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Announcement updated successfully",
      data: updatedAnnouncement[0]
    });

  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update announcement" 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = id;

    // Check if announcement exists
    const existingAnnouncement = await pgDb
      .select()
      .from(AnnouncementSchema)
      .where(eq(AnnouncementSchema.id, announcementId))
      .limit(1);

    if (existingAnnouncement.length === 0) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Delete announcement
    await pgDb
      .delete(AnnouncementSchema)
      .where(eq(AnnouncementSchema.id, announcementId));

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete announcement" 
      },
      { status: 500 }
    );
  }
}
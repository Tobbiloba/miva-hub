import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { getAdminScope } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant-scoped announcement lookup. Announcements carry no universityId,
 * so ownership is derived from the creator's university: super_admins (by
 * role) may touch any; university admins only announcements authored within
 * their own tenant. A tenant admin without a university matches nothing.
 * Prevents cross-university IDOR.
 */
async function findTenantAnnouncement(
  adminUserId: string,
  announcementId: string,
) {
  const scope = await getAdminScope(adminUserId);
  if (!scope.superAdmin && !scope.university) return null;
  const rows = await pgDb
    .select({ announcement: AnnouncementSchema })
    .from(AnnouncementSchema)
    .innerJoin(UserSchema, eq(AnnouncementSchema.createdById, UserSchema.id))
    .where(
      and(
        eq(AnnouncementSchema.id, announcementId),
        ...(scope.university
          ? [eq(UserSchema.universityId, scope.university.id)]
          : []),
      ),
    )
    .limit(1);
  return rows[0]?.announcement ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const announcementId = id;

    const announcement = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch announcement",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

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
      isActive,
    } = body;

    // Check if announcement exists — tenant-scoped (prevents cross-university IDOR)
    const existingAnnouncement = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
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
      data: updatedAnnouncement[0],
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update announcement",
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
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { id } = await params;
    const announcementId = id;

    // Check if announcement exists — tenant-scoped (prevents cross-university IDOR)
    const existingAnnouncement = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    // Delete announcement
    await pgDb
      .delete(AnnouncementSchema)
      .where(eq(AnnouncementSchema.id, announcementId));

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete announcement",
      },
      { status: 500 },
    );
  }
}

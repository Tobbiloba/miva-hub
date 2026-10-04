import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema } from "@/lib/db/pg/schema.pg";
import {
  type ContentTenant,
  manageableBy,
  resolveContentTarget,
  resolveContentTenant,
} from "@/lib/tenant-content";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant-scoped announcement lookup by the row's own universityId:
 * super_admins (by role) may touch any (incl. platform-wide NULL rows);
 * university admins only their own university's. A tenant admin without a
 * university matches nothing. Prevents cross-university IDOR.
 */
async function findTenantAnnouncement(
  adminUserId: string,
  announcementId: string,
): Promise<{
  tenant: ContentTenant;
  announcement: typeof AnnouncementSchema.$inferSelect;
} | null> {
  const tenant = await resolveContentTenant(adminUserId);
  if (!tenant) return null;
  const [announcement] = await pgDb
    .select()
    .from(AnnouncementSchema)
    .where(
      and(
        eq(AnnouncementSchema.id, announcementId),
        manageableBy(AnnouncementSchema.universityId, tenant),
      ),
    )
    .limit(1);
  return announcement ? { tenant, announcement } : null;
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

    const found = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!found) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: found.announcement,
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
    const existing = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    // Course/department references must stay inside the row's university
    // (the row's tenant never changes on update)
    const target = await resolveContentTarget(existing.tenant, {
      requestedUniversityId: existing.announcement.universityId,
      courseId,
      departmentId,
    });
    if ("error" in target) {
      return NextResponse.json(
        { success: false, message: target.error },
        { status: 400 },
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
      .where(
        and(
          eq(AnnouncementSchema.id, announcementId),
          manageableBy(AnnouncementSchema.universityId, existing.tenant),
        ),
      )
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
    const existing = await findTenantAnnouncement(
      sessionOrError.user.id,
      announcementId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    // Delete announcement
    await pgDb
      .delete(AnnouncementSchema)
      .where(
        and(
          eq(AnnouncementSchema.id, announcementId),
          manageableBy(AnnouncementSchema.universityId, existing.tenant),
        ),
      );

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

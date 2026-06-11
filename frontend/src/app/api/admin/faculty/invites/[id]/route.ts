import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { FacultyInviteSchema } from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/** DELETE /api/admin/faculty/invites/[id] — revoke a pending invite. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "No university associated with your account" },
        { status: 403 },
      );
    }

    // Tenant-scoped: admins can only revoke their own university's invites
    const [updated] = await pgDb
      .update(FacultyInviteSchema)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(FacultyInviteSchema.id, id),
          eq(FacultyInviteSchema.universityId, university.id),
          eq(FacultyInviteSchema.status, "pending"),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pending invite not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Invite revoked",
    });
  } catch (error) {
    console.error("[Faculty Invites] DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke invite" },
      { status: 500 },
    );
  }
}

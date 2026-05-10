import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/admin/content/moderation/:id
 * Actions: approve, reject, edit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof NextResponse) return adminAccess;

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  // Verify material exists
  const [material] = await pgDb
    .select({ id: CourseMaterialSchema.id })
    .from(CourseMaterialSchema)
    .where(eq(CourseMaterialSchema.id, id))
    .limit(1);

  if (!material) {
    return NextResponse.json(
      { error: "Material not found" },
      { status: 404 }
    );
  }

  switch (action) {
    case "approve": {
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          isPublished: true,
          isPublic: true,
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));

      return NextResponse.json({ success: true, action: "approved" });
    }

    case "reject": {
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));

      return NextResponse.json({ success: true, action: "rejected" });
    }

    case "edit": {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.materialType !== undefined) updates.materialType = body.materialType;
      if (body.weekNumber !== undefined) updates.weekNumber = body.weekNumber;

      await pgDb
        .update(CourseMaterialSchema)
        .set(updates)
        .where(eq(CourseMaterialSchema.id, id));

      return NextResponse.json({ success: true, action: "edited" });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use 'approve', 'reject', or 'edit'" },
        { status: 400 }
      );
  }
}

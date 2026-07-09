import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema } from "@/lib/db/pg/schema.pg";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";
import { generateNewContentNotification } from "@/lib/notifications/generators/new-content";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/admin/content/moderation/:id
 * Actions: approve, reject, edit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
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

      // Fire-and-forget: notify enrolled students about new content
      generateNewContentNotification(id).catch(() => {});

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
      if (body.description !== undefined)
        updates.description = body.description;
      if (body.materialType !== undefined)
        updates.materialType = body.materialType;
      if (body.weekNumber !== undefined) updates.weekNumber = body.weekNumber;

      await pgDb
        .update(CourseMaterialSchema)
        .set(updates)
        .where(eq(CourseMaterialSchema.id, id));

      return NextResponse.json({ success: true, action: "edited" });
    }

    case "re-extract": {
      // Fetch material details for extraction
      const [mat] = await pgDb
        .select({
          mimeType: CourseMaterialSchema.mimeType,
          contentUrl: CourseMaterialSchema.contentUrl,
          publicUrl: CourseMaterialSchema.publicUrl,
        })
        .from(CourseMaterialSchema)
        .where(eq(CourseMaterialSchema.id, id))
        .limit(1);

      const result = await extractTranscriptForMaterial(id, mat.mimeType, {
        s3Key: mat.contentUrl ?? undefined,
      });

      return NextResponse.json({
        success: result.status !== "failed",
        action: "re-extracted",
        transcriptStatus: result.status,
        wordCount: result.wordCount,
        error: result.error,
      });
    }

    case "force-recapture": {
      // Soft-delete the existing row so a new capture of the same lesson succeeds
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));

      return NextResponse.json({
        success: true,
        action: "force-recaptured",
        message:
          "Existing capture removed. Volunteers can now re-capture this lesson.",
      });
    }

    default:
      return NextResponse.json(
        {
          error:
            "Invalid action. Use 'approve', 'reject', 'edit', 're-extract', or 'force-recapture'",
        },
        { status: 400 },
      );
  }
}

/**
 * GET /api/admin/content/moderation/:id
 * Returns full transcript text for a material (admin only).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof NextResponse) return adminAccess;

  const { id } = await params;

  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      transcriptText: CourseMaterialSchema.transcriptText,
      transcriptStatus: CourseMaterialSchema.transcriptStatus,
      transcriptSource: CourseMaterialSchema.transcriptSource,
      transcriptWordCount: CourseMaterialSchema.transcriptWordCount,
    })
    .from(CourseMaterialSchema)
    .where(eq(CourseMaterialSchema.id, id))
    .limit(1);

  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: material.id,
    title: material.title,
    transcriptText: material.transcriptText,
    transcriptStatus: material.transcriptStatus,
    transcriptSource: material.transcriptSource,
    transcriptWordCount: material.transcriptWordCount,
  });
}

import {
  indexCourseMaterial,
  removeMaterialChunks,
} from "@/lib/ai/rag/index-material";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema, CourseSchema } from "@/lib/db/pg/schema.pg";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";
import { generateNewContentNotification } from "@/lib/notifications/generators/new-content";
import { isSameTenant } from "@/lib/tenant";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse, after } from "next/server";

/**
 * Load a material the admin may moderate: same tenant, and — for a student's
 * private capture — only once the student has offered it for sharing.
 * Returns null (→ 404) otherwise, without revealing whether it exists.
 */
async function loadModeratableMaterial(adminUserId: string, id: string) {
  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      ownerUserId: CourseMaterialSchema.ownerUserId,
      shareable: CourseMaterialSchema.shareable,
      mimeType: CourseMaterialSchema.mimeType,
      contentUrl: CourseMaterialSchema.contentUrl,
      vimeoVideoId: CourseMaterialSchema.vimeoVideoId,
      universityId: CourseSchema.universityId,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(eq(CourseMaterialSchema.id, id))
    .limit(1);

  if (!material) return null;
  if (!(await isSameTenant(adminUserId, material.universityId))) return null;
  if (material.ownerUserId && !material.shareable) return null;
  return material;
}

/** Re-embed after the response is sent; failures are recorded on the row. */
function reindexAfterResponse(id: string) {
  after(() => indexCourseMaterial(id).catch(() => {}));
}

/**
 * PATCH /api/admin/content/moderation/:id
 * Actions: approve, reject, edit, re-extract, force-recapture
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

  const material = await loadModeratableMaterial(adminAccess.user.id, id);
  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  switch (action) {
    case "approve": {
      // A student's share request moves into the shared corpus: ownership is
      // cleared so every enrolled student (including them) is grounded on it.
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          isPublished: true,
          isPublic: true,
          ownerUserId: null,
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));

      after(() => generateNewContentNotification(id).catch(() => {}));
      // Re-index so its chunks become shared (owner cleared)
      reindexAfterResponse(id);

      return NextResponse.json({ success: true, action: "approved" });
    }

    case "reject": {
      if (material.ownerUserId) {
        // Declining a share request keeps it private to the student
        await pgDb
          .update(CourseMaterialSchema)
          .set({ shareable: false, updatedAt: new Date() })
          .where(eq(CourseMaterialSchema.id, id));
        return NextResponse.json({ success: true, action: "rejected" });
      }

      await pgDb
        .update(CourseMaterialSchema)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));
      await removeMaterialChunks(id);

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
      // Chunk titles/weeks/text derive from these fields
      reindexAfterResponse(id);

      return NextResponse.json({ success: true, action: "edited" });
    }

    case "re-extract": {
      // Extraction re-indexes the material when it succeeds
      const result = await extractTranscriptForMaterial(id, material.mimeType, {
        s3Key: material.contentUrl ?? undefined,
        vimeoVideoId: material.vimeoVideoId ?? undefined,
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
      if (material.ownerUserId) {
        return NextResponse.json(
          { error: "A student's own capture can't be force-recaptured" },
          { status: 400 },
        );
      }
      // Soft-delete the existing row so a new capture of the same lesson succeeds
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, id));
      await removeMaterialChunks(id);

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
 * Returns full transcript text for a material (admin only, same tenant).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof NextResponse) return adminAccess;

  const { id } = await params;

  if (!(await loadModeratableMaterial(adminAccess.user.id, id))) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    id: material.id,
    title: material.title,
    transcriptText: material.transcriptText,
    transcriptStatus: material.transcriptStatus,
    transcriptSource: material.transcriptSource,
    transcriptWordCount: material.transcriptWordCount,
  });
}

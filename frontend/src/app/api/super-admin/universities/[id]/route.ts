import { requireSuperAdmin } from "@/lib/auth/admin";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateUniversitySchema = z.object({
  status: z.enum(["pending", "active", "suspended"]).optional(),
  name: z.string().min(3).max(120).optional(),
  supportEmail: z.string().email().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().max(20).nullable().optional(),
});

/**
 * PATCH /api/super-admin/universities/[id] — approve/suspend a tenant
 * (status changes) or edit platform-managed fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireSuperAdmin();
    if (access instanceof NextResponse) {
      return access;
    }

    const { id } = await params;
    const body = await request.json();
    const updates = updateUniversitySchema.parse(body);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const existing = await pgUniversityRepository.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "University not found" },
        { status: 404 },
      );
    }

    const updated = await pgUniversityRepository.update(id, updates);

    if (updates.status && updates.status !== existing.status) {
      console.log("[Super Admin Universities] Status change:", {
        universityId: id,
        slug: existing.slug,
        from: existing.status,
        to: updates.status,
        by: access.user.id,
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Super Admin Universities] PATCH Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update university" },
      { status: 500 },
    );
  }
}

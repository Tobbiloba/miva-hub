import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ClassScheduleSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateScheduleSchema = z.object({
  dayOfWeek: z
    .enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ])
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format")
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format")
    .optional(),
  roomLocation: z.string().min(1).optional(),
  buildingName: z.string().nullable().optional(),
  classType: z.enum(["lecture", "lab", "tutorial", "seminar"]).optional(),
  semester: z.string().min(1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;

    const [schedule] = await pgDb
      .select()
      .from(ClassScheduleSchema)
      .where(eq(ClassScheduleSchema.id, id))
      .limit(1);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch schedule",
        message: error instanceof Error ? error.message : "Unknown error",
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
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;
    const body = await request.json();
    const validated = updateScheduleSchema.parse(body);

    const [existing] = await pgDb
      .select()
      .from(ClassScheduleSchema)
      .where(eq(ClassScheduleSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    // Validate time ordering if both provided
    const start = validated.startTime ?? existing.startTime;
    const end = validated.endTime ?? existing.endTime;
    if (end <= start) {
      return NextResponse.json(
        { success: false, error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const [updated] = await pgDb
      .update(ClassScheduleSchema)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(ClassScheduleSchema.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Schedule updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update schedule",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;

    const [existing] = await pgDb
      .select()
      .from(ClassScheduleSchema)
      .where(eq(ClassScheduleSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    await pgDb
      .delete(ClassScheduleSchema)
      .where(eq(ClassScheduleSchema.id, id));

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete schedule",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  type ClassScheduleEntity,
  ClassScheduleSchema,
  CourseSchema,
} from "@/lib/db/pg/schema.pg";
import { type SQL, and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createScheduleSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  semester: z.string().min(1, "Semester is required"),
  dayOfWeek: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
  roomLocation: z.string().min(1, "Room location is required"),
  buildingName: z.string().optional(),
  classType: z
    .enum(["lecture", "lab", "tutorial", "seminar"])
    .default("lecture"),
});

export async function GET(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const conditions: (SQL | undefined)[] = [];
    if (courseId) conditions.push(eq(ClassScheduleSchema.courseId, courseId));
    if (dayOfWeek)
      conditions.push(
        eq(
          ClassScheduleSchema.dayOfWeek,
          dayOfWeek as ClassScheduleEntity["dayOfWeek"],
        ),
      );

    const schedules = await pgDb
      .select({
        id: ClassScheduleSchema.id,
        courseId: ClassScheduleSchema.courseId,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        semester: ClassScheduleSchema.semester,
        dayOfWeek: ClassScheduleSchema.dayOfWeek,
        startTime: ClassScheduleSchema.startTime,
        endTime: ClassScheduleSchema.endTime,
        roomLocation: ClassScheduleSchema.roomLocation,
        buildingName: ClassScheduleSchema.buildingName,
        classType: ClassScheduleSchema.classType,
        createdAt: ClassScheduleSchema.createdAt,
      })
      .from(ClassScheduleSchema)
      .innerJoin(
        CourseSchema,
        eq(ClassScheduleSchema.courseId, CourseSchema.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ClassScheduleSchema.createdAt));

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch schedules",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const body = await request.json();
    const validated = createScheduleSchema.parse(body);

    // Validate endTime > startTime
    if (validated.endTime <= validated.startTime) {
      return NextResponse.json(
        { success: false, error: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Verify course exists
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(eq(CourseSchema.id, validated.courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const [schedule] = await pgDb
      .insert(ClassScheduleSchema)
      .values({
        courseId: validated.courseId,
        semester: validated.semester,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        roomLocation: validated.roomLocation,
        buildingName: validated.buildingName || null,
        classType: validated.classType,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: schedule,
        message: "Class schedule created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create schedule",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

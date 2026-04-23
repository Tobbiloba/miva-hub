import { NextRequest, NextResponse } from "next/server";
import { requireFaculty, checkCourseInstructorAccess } from "@/lib/auth/faculty";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema, CourseSchema } from "@/lib/db/pg/schema.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  courseId: z.string().uuid("Invalid course ID"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  expiresAt: z.string().optional(),
});

export async function GET() {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const announcements = await pgDb
      .select({
        id: AnnouncementSchema.id,
        title: AnnouncementSchema.title,
        content: AnnouncementSchema.content,
        courseId: AnnouncementSchema.courseId,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        priority: AnnouncementSchema.priority,
        isActive: AnnouncementSchema.isActive,
        expiresAt: AnnouncementSchema.expiresAt,
        createdAt: AnnouncementSchema.createdAt,
      })
      .from(AnnouncementSchema)
      .leftJoin(CourseSchema, eq(AnnouncementSchema.courseId, CourseSchema.id))
      .where(eq(AnnouncementSchema.createdById, session.user.id))
      .orderBy(desc(AnnouncementSchema.createdAt));

    return NextResponse.json({ success: true, data: announcements });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch announcements", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const body = await request.json();
    const validated = createAnnouncementSchema.parse(body);

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(session.user.id, validated.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You are not assigned to teach this course" },
        { status: 403 }
      );
    }

    const [announcement] = await pgDb
      .insert(AnnouncementSchema)
      .values({
        title: validated.title,
        content: validated.content,
        courseId: validated.courseId,
        targetAudience: "course_specific",
        priority: validated.priority,
        isActive: true,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdById: session.user.id,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: announcement, message: "Announcement created" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create announcement", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

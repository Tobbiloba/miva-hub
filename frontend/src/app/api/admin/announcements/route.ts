import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  type AnnouncementEntity,
  AnnouncementSchema,
  CourseSchema,
  DepartmentSchema,
  FacultySchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { type SQL, and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const audience = searchParams.get("audience");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Apply filters
    const conditions: (SQL | undefined)[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(AnnouncementSchema.title, `%${search}%`),
          ilike(AnnouncementSchema.content, `%${search}%`),
        ),
      );
    }

    if (audience && audience !== "all") {
      conditions.push(
        eq(
          AnnouncementSchema.targetAudience,
          audience as AnnouncementEntity["targetAudience"],
        ),
      );
    }

    if (priority && priority !== "all") {
      conditions.push(
        eq(
          AnnouncementSchema.priority,
          priority as AnnouncementEntity["priority"],
        ),
      );
    }

    if (status && status !== "all") {
      if (status === "published") {
        conditions.push(eq(AnnouncementSchema.isActive, true));
      } else if (status === "draft") {
        conditions.push(eq(AnnouncementSchema.isActive, false));
      } else if (status === "expired") {
        conditions.push(
          and(
            eq(AnnouncementSchema.isActive, true),
            sql`${AnnouncementSchema.expiresAt} < NOW()`,
          ),
        );
      }
    }

    // Build query
    const announcements = await pgDb
      .select({
        announcement: AnnouncementSchema,
        author: UserSchema,
        course: CourseSchema,
        department: DepartmentSchema,
      })
      .from(AnnouncementSchema)
      .leftJoin(UserSchema, eq(AnnouncementSchema.createdById, UserSchema.id))
      .leftJoin(CourseSchema, eq(AnnouncementSchema.courseId, CourseSchema.id))
      .leftJoin(
        DepartmentSchema,
        eq(AnnouncementSchema.departmentId, DepartmentSchema.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(AnnouncementSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Compute real audience counts for totalTargeted
    const [totalUsersResult, studentCountResult, activeFacultyResult] =
      await Promise.all([
        pgDb.select({ count: sql<number>`count(*)::int` }).from(UserSchema),
        pgDb
          .select({ count: sql<number>`count(*)::int` })
          .from(UserSchema)
          .where(eq(UserSchema.role, "student")),
        pgDb
          .select({ count: sql<number>`count(*)::int` })
          .from(FacultySchema)
          .where(eq(FacultySchema.isActive, true)),
      ]);
    const totalUsers: number = totalUsersResult[0]?.count ?? 0;
    const studentCount: number = studentCountResult[0]?.count ?? 0;
    const activeFacultyCount: number = activeFacultyResult[0]?.count ?? 0;

    // For course_specific announcements, batch-fetch enrollment counts in one query
    const courseSpecificIds = announcements
      .filter(
        ({ announcement: a }) =>
          a.targetAudience === "course_specific" && a.courseId,
      )
      .map(({ announcement: a }) => a.courseId!);
    const courseEnrollmentCounts = new Map<string, number>();
    if (courseSpecificIds.length > 0) {
      const rows = await pgDb
        .select({
          courseId: StudentEnrollmentSchema.courseId,
          count: sql<number>`count(*)::int`,
        })
        .from(StudentEnrollmentSchema)
        .where(inArray(StudentEnrollmentSchema.courseId, courseSpecificIds))
        .groupBy(StudentEnrollmentSchema.courseId);
      for (const row of rows) {
        courseEnrollmentCounts.set(row.courseId, row.count);
      }
    }

    // Transform data to match frontend interface
    const transformedAnnouncements = announcements.map(
      ({ announcement, author, course, department }) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        author: author?.name || "Unknown",
        audience: announcement.targetAudience,
        department: department?.code || announcement.departmentId || "all",
        priority: announcement.priority,
        status: announcement.isActive ? "published" : "draft",
        publishedAt: announcement.isActive
          ? announcement.createdAt.toISOString()
          : null,
        scheduledFor: null, // Would need additional scheduling logic
        // readCount removed: no read-tracking table exists yet (Sprint 3)
        totalTargeted: (() => {
          switch (announcement.targetAudience) {
            case "all":
              return totalUsers;
            case "students":
              return studentCount;
            case "faculty":
              return activeFacultyCount;
            case "course_specific":
              return announcement.courseId
                ? (courseEnrollmentCounts.get(announcement.courseId) ?? null)
                : null;
            default:
              return null; // department_specific — Sprint 1
          }
        })(),
        isPinned:
          announcement.priority === "high" ||
          announcement.priority === "urgent",
        expiresAt: announcement.expiresAt?.toISOString() || null,
        courses: course ? [course.courseCode] : [],
        attachments: [], // Would need separate attachments table
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      }),
    );

    // Get total count
    const totalCount = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(AnnouncementSchema);

    return NextResponse.json({
      success: true,
      data: transformedAnnouncements,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch announcements",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

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

    // Validate required fields
    if (!title || !content || !targetAudience) {
      return NextResponse.json(
        {
          success: false,
          message: "Title, content, and target audience are required",
        },
        { status: 400 },
      );
    }

    // Get current user ID
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, session.user.email))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Create announcement
    const newAnnouncement = await pgDb
      .insert(AnnouncementSchema)
      .values({
        title,
        content,
        targetAudience,
        priority: priority || "medium",
        courseId: courseId || null,
        departmentId: departmentId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false, // Default to true
        createdById: user[0].id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Announcement created successfully",
      data: newAnnouncement[0],
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create announcement",
      },
      { status: 500 },
    );
  }
}

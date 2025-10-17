import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AnnouncementSchema, UserSchema, CourseSchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql, desc, ilike, or, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const audience = searchParams.get('audience');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = pgDb
      .select({
        announcement: AnnouncementSchema,
        author: UserSchema,
        course: CourseSchema,
        department: DepartmentSchema,
      })
      .from(AnnouncementSchema)
      .leftJoin(UserSchema, eq(AnnouncementSchema.createdById, UserSchema.id))
      .leftJoin(CourseSchema, eq(AnnouncementSchema.courseId, CourseSchema.id))
      .leftJoin(DepartmentSchema, eq(AnnouncementSchema.departmentId, DepartmentSchema.id))
      .orderBy(desc(AnnouncementSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(AnnouncementSchema.title, `%${search}%`),
          ilike(AnnouncementSchema.content, `%${search}%`)
        )
      );
    }

    if (audience && audience !== 'all') {
      conditions.push(eq(AnnouncementSchema.targetAudience, audience));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(AnnouncementSchema.priority, priority));
    }

    if (status && status !== 'all') {
      if (status === 'published') {
        conditions.push(eq(AnnouncementSchema.isActive, true));
      } else if (status === 'draft') {
        conditions.push(eq(AnnouncementSchema.isActive, false));
      } else if (status === 'expired') {
        conditions.push(
          and(
            eq(AnnouncementSchema.isActive, true),
            sql`${AnnouncementSchema.expiresAt} < NOW()`
          )
        );
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const announcements = await query;

    // Transform data to match frontend interface
    const transformedAnnouncements = announcements.map(({ announcement, author, course, department }) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      author: author?.name || 'Unknown',
      audience: announcement.targetAudience,
      department: department?.code || announcement.departmentId || 'all',
      priority: announcement.priority,
      status: announcement.isActive ? 'published' : 'draft',
      publishedAt: announcement.isActive ? announcement.createdAt.toISOString() : null,
      scheduledFor: null, // Would need additional scheduling logic
      readCount: Math.floor(Math.random() * 500), // Placeholder - would track actual reads
      totalTargeted: announcement.targetAudience === 'all' ? 650 : 
                     announcement.targetAudience === 'students' ? 450 :
                     announcement.targetAudience === 'faculty' ? 45 : 100,
      isPinned: announcement.priority === 'high' || announcement.priority === 'urgent',
      expiresAt: announcement.expiresAt?.toISOString() || null,
      courses: course ? [course.courseCode] : [],
      attachments: [], // Would need separate attachments table
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    }));

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
        hasMore: offset + limit < (totalCount[0]?.count || 0)
      }
    });

  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch announcements" 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      content, 
      targetAudience,
      priority,
      courseId,
      departmentId,
      expiresAt,
      isActive 
    } = body;

    // Validate required fields
    if (!title || !content || !targetAudience) {
      return NextResponse.json(
        { success: false, message: "Title, content, and target audience are required" },
        { status: 400 }
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
        { status: 404 }
      );
    }

    // Create announcement
    const newAnnouncement = await pgDb
      .insert(AnnouncementSchema)
      .values({
        title,
        content,
        targetAudience,
        priority: priority || 'medium',
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
      data: newAnnouncement[0]
    });

  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create announcement" 
      },
      { status: 500 }
    );
  }
}
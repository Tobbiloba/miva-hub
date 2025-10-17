import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CalendarEventSchema, UserSchema, CourseSchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql, desc, ilike, or, gte, lte, between } from "drizzle-orm";

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
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = pgDb
      .select({
        event: CalendarEventSchema,
        creator: UserSchema,
        course: CourseSchema,
        department: DepartmentSchema,
      })
      .from(CalendarEventSchema)
      .leftJoin(UserSchema, eq(CalendarEventSchema.createdById, UserSchema.id))
      .leftJoin(CourseSchema, eq(CalendarEventSchema.courseId, CourseSchema.id))
      .leftJoin(DepartmentSchema, eq(CalendarEventSchema.departmentId, DepartmentSchema.id))
      .orderBy(desc(CalendarEventSchema.startDate))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(CalendarEventSchema.title, `%${search}%`),
          ilike(CalendarEventSchema.description, `%${search}%`)
        )
      );
    }

    if (eventType && eventType !== 'all') {
      conditions.push(eq(CalendarEventSchema.eventType, eventType));
    }

    if (status && status !== 'all') {
      conditions.push(eq(CalendarEventSchema.status, status));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(CalendarEventSchema.priority, priority));
    }

    if (startDate) {
      conditions.push(gte(CalendarEventSchema.startDate, startDate));
    }

    if (endDate) {
      conditions.push(lte(CalendarEventSchema.endDate, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const events = await query;

    // Transform data to match frontend interface
    const transformedEvents = events.map(({ event, creator, course, department }) => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      type: event.eventType,
      date: event.startDate.toISOString().split('T')[0],
      time: event.startTime || (event.isAllDay ? 'All Day' : '09:00'),
      endDate: event.endDate.toISOString().split('T')[0],
      endTime: event.endTime || event.startTime,
      location: event.location || '',
      priority: event.priority,
      status: event.status,
      affectedUsers: event.affectedUsers,
      creator: creator?.name || 'System',
      course: course ? `${course.courseCode} - ${course.title}` : null,
      department: department?.name || null,
      isAllDay: event.isAllDay,
      isRecurring: event.isRecurring,
      remindersEnabled: event.remindersEnabled,
      attendeeCount: event.affectedUsers === 'all' ? 650 : 
                    event.affectedUsers === 'students' ? 450 :
                    event.affectedUsers === 'faculty' ? 45 : 100,
      color: getEventColor(event.eventType),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));

    // Get total count
    const totalCount = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(CalendarEventSchema);

    return NextResponse.json({
      success: true,
      data: transformedEvents,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount[0]?.count || 0)
      }
    });

  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch calendar events" 
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
      description, 
      eventType,
      startDate,
      endDate,
      startTime,
      endTime,
      isAllDay,
      location,
      priority,
      status,
      affectedUsers,
      courseId,
      departmentId,
      remindersEnabled,
      isRecurring,
      recurringPattern
    } = body;

    // Validate required fields
    if (!title || !eventType || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "Title, event type, start date, and end date are required" },
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

    // Create calendar event
    const newEvent = await pgDb
      .insert(CalendarEventSchema)
      .values({
        title,
        description,
        eventType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        isAllDay: isAllDay === true,
        location,
        priority: priority || 'medium',
        status: status || 'scheduled',
        affectedUsers: affectedUsers || 'all',
        courseId: courseId || null,
        departmentId: departmentId || null,
        remindersEnabled: remindersEnabled !== false,
        isRecurring: isRecurring === true,
        recurringPattern: recurringPattern || null,
        createdById: user[0].id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Calendar event created successfully",
      data: newEvent[0]
    });

  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create calendar event" 
      },
      { status: 500 }
    );
  }
}

function getEventColor(eventType: string): string {
  const colors = {
    academic: 'blue',
    registration: 'green',
    exam: 'red',
    holiday: 'purple',
    professional: 'orange',
    ceremony: 'indigo',
    maintenance: 'gray'
  };
  return colors[eventType as keyof typeof colors] || 'blue';
}

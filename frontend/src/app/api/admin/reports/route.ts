import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ReportConfigSchema, ReportInstanceSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, sql, desc, ilike, or } from "drizzle-orm";

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
    const category = searchParams.get('category');
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');
    const schedule = searchParams.get('schedule');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for report configs with latest instance info
    let query = pgDb
      .select({
        config: ReportConfigSchema,
        creator: UserSchema,
        latestInstance: ReportInstanceSchema,
      })
      .from(ReportConfigSchema)
      .leftJoin(UserSchema, eq(ReportConfigSchema.createdById, UserSchema.id))
      .leftJoin(
        ReportInstanceSchema, 
        and(
          eq(ReportConfigSchema.id, ReportInstanceSchema.reportConfigId),
          eq(ReportInstanceSchema.id, 
            pgDb.select({
              id: ReportInstanceSchema.id
            })
            .from(ReportInstanceSchema)
            .where(eq(ReportInstanceSchema.reportConfigId, ReportConfigSchema.id))
            .orderBy(desc(ReportInstanceSchema.generatedAt))
            .limit(1)
          )
        )
      )
      .orderBy(desc(ReportConfigSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(ReportConfigSchema.name, `%${search}%`),
          ilike(ReportConfigSchema.description, `%${search}%`)
        )
      );
    }

    if (category && category !== 'all') {
      conditions.push(eq(ReportConfigSchema.category, category));
    }

    if (reportType && reportType !== 'all') {
      conditions.push(eq(ReportConfigSchema.reportType, reportType));
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        conditions.push(eq(ReportConfigSchema.isActive, true));
      } else if (status === 'inactive') {
        conditions.push(eq(ReportConfigSchema.isActive, false));
      }
    }

    if (schedule && schedule !== 'all') {
      conditions.push(eq(ReportConfigSchema.schedule, schedule));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const reports = await query;

    // Transform data to match frontend interface
    const transformedReports = reports.map(({ config, creator, latestInstance }) => ({
      id: config.id,
      name: config.name,
      description: config.description || '',
      category: config.category,
      type: config.reportType,
      format: config.format,
      schedule: config.schedule,
      status: config.isActive ? 'active' : 'paused',
      createdBy: creator?.name || 'System',
      lastGenerated: config.lastGenerated?.toISOString() || null,
      nextScheduled: config.nextScheduled?.toISOString() || null,
      downloads: latestInstance?.downloadCount || 0,
      size: latestInstance?.fileSize ? formatFileSize(latestInstance.fileSize) : '0 MB',
      recipients: config.recipients || [],
      generationCount: config.generationCount,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    }));

    // Get total count
    const totalCount = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(ReportConfigSchema);

    return NextResponse.json({
      success: true,
      data: transformedReports,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount[0]?.count || 0)
      }
    });

  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch reports" 
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
      name, 
      description, 
      category,
      reportType,
      format,
      schedule,
      recipients,
      parameters,
      queryTemplate,
      isActive
    } = body;

    // Validate required fields
    if (!name || !category || !reportType) {
      return NextResponse.json(
        { success: false, message: "Name, category, and report type are required" },
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

    // Create report configuration
    const newReport = await pgDb
      .insert(ReportConfigSchema)
      .values({
        name,
        description,
        category,
        reportType: reportType || 'custom',
        format: format || 'pdf',
        schedule: schedule || 'manual',
        recipients: recipients || [],
        parameters: parameters || {},
        queryTemplate,
        isActive: isActive !== false,
        createdById: user[0].id,
        nextScheduled: schedule !== 'manual' ? getNextScheduledDate(schedule) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Report configuration created successfully",
      data: newReport[0]
    });

  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create report" 
      },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getNextScheduledDate(schedule: string): Date {
  const now = new Date();
  const next = new Date(now);
  
  switch (schedule) {
    case 'daily':
      next.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(now.getMonth() + 3);
      break;
    case 'semester':
      next.setMonth(now.getMonth() + 6);
      break;
    case 'yearly':
      next.setFullYear(now.getFullYear() + 1);
      break;
    default:
      return now;
  }
  
  return next;
}

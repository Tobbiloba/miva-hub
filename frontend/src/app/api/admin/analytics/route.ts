import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  academicAnalytics,
  getSystemOverview,
  getCourseAnalytics,
  getLearningInsights,
  getDepartmentAnalytics,
  getFacultyAnalytics,
  getRealTimeStats
} from "@/lib/analytics/academic-analytics";
import { z } from "zod";

// Request schema for analytics queries
const analyticsQuerySchema = z.object({
  type: z.enum(['overview', 'courses', 'departments', 'faculty', 'insights', 'realtime', 'all']).optional().default('all'),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  refresh: z.boolean().optional().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.parse({
      type: searchParams.get('type') || 'all',
      departmentId: searchParams.get('departmentId') || undefined,
      courseId: searchParams.get('courseId') || undefined,
      refresh: searchParams.get('refresh') === 'true'
    });

    // Clear cache if refresh requested
    if (query.refresh) {
      academicAnalytics.clearCache();
    }

    // Fetch requested analytics data
    let responseData: any = {};

    switch (query.type) {
      case 'overview':
        responseData = await getSystemOverview();
        break;

      case 'courses':
        responseData = await getCourseAnalytics(query.departmentId);
        break;

      case 'departments':
        responseData = await getDepartmentAnalytics();
        break;

      case 'faculty':
        responseData = await getFacultyAnalytics(query.departmentId);
        break;

      case 'insights':
        responseData = await getLearningInsights();
        break;

      case 'realtime':
        responseData = await getRealTimeStats();
        break;

      case 'all':
      default:
        const [
          systemOverview,
          courseAnalytics,
          learningInsights,
          departmentAnalytics,
          facultyAnalytics,
          realTimeStats
        ] = await Promise.all([
          getSystemOverview(),
          getCourseAnalytics(query.departmentId),
          getLearningInsights(),
          getDepartmentAnalytics(),
          getFacultyAnalytics(query.departmentId),
          getRealTimeStats()
        ]);

        responseData = {
          systemOverview,
          courseAnalytics,
          learningInsights,
          departmentAnalytics,
          facultyAnalytics,
          realTimeStats,
          lastUpdated: new Date().toISOString()
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      query
    });

  } catch (error) {
    console.error('[Analytics API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for triggering analytics updates
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'refresh':
        // Clear all analytics cache
        academicAnalytics.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Analytics cache cleared successfully'
        });

      case 'generate_report':
        // Generate comprehensive analytics report
        const reportData = await Promise.all([
          getSystemOverview(),
          getCourseAnalytics(),
          getLearningInsights(),
          getDepartmentAnalytics(),
          getFacultyAnalytics()
        ]);

        return NextResponse.json({
          success: true,
          report: {
            generatedAt: new Date().toISOString(),
            systemOverview: reportData[0],
            courseAnalytics: reportData[1],
            learningInsights: reportData[2],
            departmentAnalytics: reportData[3],
            facultyAnalytics: reportData[4]
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Analytics API] POST Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process analytics request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
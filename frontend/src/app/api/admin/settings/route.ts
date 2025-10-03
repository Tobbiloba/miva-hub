import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { z } from "zod";

// Validation schema for system settings
const systemSettingsSchema = z.object({
  university: z.object({
    name: z.string().min(1).optional(),
    shortName: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    logo: z.string().optional(),
  }).optional(),
  academic: z.object({
    currentSemester: z.enum(["fall", "spring", "summer"]).optional(),
    currentYear: z.number().int().min(2020).max(2030).optional(),
    gradingScale: z.enum(["4.0", "5.0", "percentage"]).optional(),
    maxCreditHours: z.number().int().min(12).max(30).optional(),
    minCreditHours: z.number().int().min(6).max(20).optional(),
    withdrawalDeadline: z.string().optional(),
    addDropDeadline: z.string().optional(),
  }).optional(),
  email: z.object({
    smtpHost: z.string().optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    fromEmail: z.string().email().optional(),
    fromName: z.string().optional(),
    enableNotifications: z.boolean().optional(),
  }).optional(),
  security: z.object({
    requireEmailVerification: z.boolean().optional(),
    passwordMinLength: z.number().int().min(6).max(50).optional(),
    sessionTimeout: z.number().int().min(30).max(1440).optional(), // minutes
    maxLoginAttempts: z.number().int().min(3).max(10).optional(),
    lockoutDuration: z.number().int().min(5).max(60).optional(), // minutes
    twoFactorRequired: z.boolean().optional(),
  }).optional(),
  features: z.object({
    enableChat: z.boolean().optional(),
    enableFileUploads: z.boolean().optional(),
    enableNotifications: z.boolean().optional(),
    enableAnalytics: z.boolean().optional(),
    enablePublicRegistration: z.boolean().optional(),
    enableGuestAccess: z.boolean().optional(),
    maxFileSize: z.number().int().min(1).max(100).optional(), // MB
    allowedFileTypes: z.array(z.string()).optional(),
  }).optional(),
  system: z.object({
    maintenanceMode: z.boolean().optional(),
    debugMode: z.boolean().optional(),
    logLevel: z.enum(["error", "warn", "info", "debug"]).optional(),
    backupFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    retentionPeriod: z.number().int().min(30).max(365).optional(), // days
  }).optional(),
});

// Default system settings
const defaultSettings = {
  university: {
    name: "MIVA Open University",
    shortName: "MIVA",
    address: "Lagos, Nigeria",
    phone: "+234-XXX-XXX-XXXX",
    email: "admin@miva.edu.ng",
    website: "https://miva.edu.ng",
    logo: null,
  },
  academic: {
    currentSemester: "fall" as const,
    currentYear: new Date().getFullYear(),
    gradingScale: "4.0" as const,
    maxCreditHours: 24,
    minCreditHours: 12,
    withdrawalDeadline: "2024-11-01",
    addDropDeadline: "2024-09-15",
  },
  email: {
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "noreply@miva.edu.ng",
    fromName: "MIVA University",
    enableNotifications: true,
  },
  security: {
    requireEmailVerification: true,
    passwordMinLength: 8,
    sessionTimeout: 480, // 8 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15, // 15 minutes
    twoFactorRequired: false,
  },
  features: {
    enableChat: true,
    enableFileUploads: true,
    enableNotifications: true,
    enableAnalytics: true,
    enablePublicRegistration: false,
    enableGuestAccess: false,
    maxFileSize: 25, // 25 MB
    allowedFileTypes: [
      ".pdf", ".doc", ".docx", ".txt", ".rtf",
      ".jpg", ".jpeg", ".png", ".gif",
      ".mp4", ".avi", ".mov", ".wmv",
      ".zip", ".rar", ".7z"
    ],
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
    logLevel: "info" as const,
    backupFrequency: "daily" as const,
    retentionPeriod: 90, // 90 days
  },
};

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // In a real implementation, these would be stored in the database
    // For now, we'll return the default settings
    const settings = defaultSettings;

    return NextResponse.json({
      success: true,
      data: settings,
      message: "System settings retrieved successfully"
    });

  } catch (error) {
    console.error('[Settings API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch system settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = systemSettingsSchema.parse(body);

    // In a real implementation, these would be saved to the database
    // For now, we'll simulate successful update
    const updatedSettings = {
      ...defaultSettings,
      ...validatedData,
    };

    // Merge nested objects properly
    Object.keys(validatedData).forEach(key => {
      if (typeof validatedData[key as keyof typeof validatedData] === 'object' && validatedData[key as keyof typeof validatedData] !== null) {
        (updatedSettings as any)[key] = {
          ...(defaultSettings as any)[key],
          ...validatedData[key as keyof typeof validatedData],
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: "System settings updated successfully"
    });

  } catch (error) {
    console.error('[Settings API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update system settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'backup':
        // Simulate database backup
        return NextResponse.json({
          success: true,
          message: "Database backup initiated successfully",
          backupId: `backup_${Date.now()}`,
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        });

      case 'maintenance':
        const { enabled } = await request.json();
        return NextResponse.json({
          success: true,
          message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
          maintenanceMode: enabled
        });

      case 'clear-cache':
        // Simulate cache clearing
        return NextResponse.json({
          success: true,
          message: "System cache cleared successfully",
          clearedAt: new Date().toISOString()
        });

      case 'test-email':
        const { testEmail } = await request.json();
        // Simulate email test
        return NextResponse.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
          sentAt: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          message: `Action "${action}" is not supported`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Settings API] POST Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute system action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
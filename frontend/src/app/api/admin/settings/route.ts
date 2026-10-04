import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { SystemSettingsSchema } from "@/lib/db/pg/schema.pg";
import { getAdminScope } from "@/lib/tenant";
import { type SQL, and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Settings tenant scope, derived from the SESSION:
 * - university admin → only rows with universityId = their university
 * - super_admin → platform-level rows (universityId IS NULL)
 * Returns null for a tenant admin without a university (forbidden).
 */
async function settingsScope(
  adminUserId: string,
): Promise<{ universityId: string | null; filter: SQL } | null> {
  const scope = await getAdminScope(adminUserId);
  if (scope.superAdmin) {
    return {
      universityId: null,
      filter: isNull(SystemSettingsSchema.universityId),
    };
  }
  if (!scope.university) return null;
  return {
    universityId: scope.university.id,
    filter: eq(SystemSettingsSchema.universityId, scope.university.id),
  };
}

const forbidden = () =>
  NextResponse.json(
    { success: false, message: "Admin is not assigned to a university" },
    { status: 403 },
  );

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const scope = await settingsScope(sessionOrError.user.id);
    if (!scope) return forbidden();

    // Build query — tenant-scoped
    const settings = await pgDb
      .select()
      .from(SystemSettingsSchema)
      .where(
        and(
          scope.filter,
          category && category !== "all"
            ? eq(SystemSettingsSchema.category, category)
            : undefined,
        ),
      )
      .orderBy(SystemSettingsSchema.category, SystemSettingsSchema.key);

    // Group settings by category
    const groupedSettings = settings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }

        // Don't expose secret values
        const settingValue = setting.isSecret ? "***HIDDEN***" : setting.value;

        acc[setting.category].push({
          ...setting,
          value: settingValue,
        });

        return acc;
      },
      {} as Record<string, any[]>,
    );

    return NextResponse.json({
      success: true,
      data: groupedSettings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch settings",
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

    const body = await request.json();
    const {
      category,
      key,
      value,
      valueType,
      description,
      isEditable,
      isSecret,
    } = body;

    // Validate required fields
    if (!category || !key) {
      return NextResponse.json(
        { success: false, message: "Category and key are required" },
        { status: 400 },
      );
    }

    const scope = await settingsScope(sessionOrError.user.id);
    if (!scope) return forbidden();

    // Check if setting already exists (within this tenant's scope)
    const existingSetting = await pgDb
      .select()
      .from(SystemSettingsSchema)
      .where(
        and(
          scope.filter,
          eq(SystemSettingsSchema.category, category),
          eq(SystemSettingsSchema.key, key),
        ),
      )
      .limit(1);

    if (existingSetting.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Setting with this category and key already exists",
        },
        { status: 400 },
      );
    }

    // Create new setting
    const newSetting = await pgDb
      .insert(SystemSettingsSchema)
      .values({
        universityId: scope.universityId,
        category,
        key,
        value: value || null,
        valueType: valueType || "string",
        description,
        isEditable: isEditable !== false, // Default to true
        isSecret: isSecret === true, // Default to false
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Setting created successfully",
      data: newSetting[0],
    });
  } catch (error) {
    console.error("Error creating setting:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create setting",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const { settings } = body; // Array of { id, value } objects

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, message: "Settings array is required" },
        { status: 400 },
      );
    }

    const scope = await settingsScope(sessionOrError.user.id);
    if (!scope) return forbidden();
    const isSuperAdmin = scope.universityId === null;

    // Update settings in batch — each row must be in the admin's tenant
    // (super_admin may edit any row; platform rows are super_admin only)
    const updatePromises = settings.map(({ id, value }) => {
      return pgDb
        .update(SystemSettingsSchema)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(SystemSettingsSchema.id, id),
            eq(SystemSettingsSchema.isEditable, true), // Only allow editing editable settings
            isSuperAdmin ? undefined : scope.filter,
          ),
        )
        .returning();
    });

    const results = await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: results.flat(),
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update settings",
      },
      { status: 500 },
    );
  }
}

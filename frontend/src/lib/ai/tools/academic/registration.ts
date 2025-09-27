/**
 * Academic Tools Registration Service
 * Integrates academic tools with the MCP system for MIVA University students
 */

import { academicTools, AcademicToolNames } from "./index";
import { pgDb } from "../../../db/pg/db.pg";
import { UserSchema, StudentEnrollmentSchema } from "../../../db/pg/schema.pg";
import { eq } from "drizzle-orm";
import globalLogger from "logger";

/**
 * Register academic tools for a specific user
 * Called when a student enrolls or first accesses the system
 */
export async function registerAcademicToolsForUser(userId: string): Promise<{
  success: boolean;
  message: string;
  registeredTools?: string[];
  error?: string;
}> {
  try {
    globalLogger.info(`[Academic Tools] Registering tools for user ${userId}`);

    // Verify user exists and is a student
    const user = await pgDb
      .select({
        id: UserSchema.id,
        name: UserSchema.name,
        email: UserSchema.email,
        role: UserSchema.role,
        year: UserSchema.year,
        currentSemester: UserSchema.currentSemester,
        major: UserSchema.major
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (user.length === 0) {
      return {
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND"
      };
    }

    const userData = user[0];

    // Check if user is a student (only students get academic tools)
    if (userData.role !== 'student') {
      globalLogger.info(`[Academic Tools] User ${userId} is not a student (role: ${userData.role}), skipping registration`);
      return {
        success: false,
        message: `Academic tools are only available for students. User role: ${userData.role}`,
        error: "NOT_STUDENT"
      };
    }

    // Check if user has course enrollments
    const enrollments = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.studentId, userId))
      .limit(1);

    if (enrollments.length === 0) {
      globalLogger.warn(`[Academic Tools] User ${userId} has no course enrollments, tools may have limited functionality`);
    }

    // Register tools (for now, we'll log the registration since MCP integration is complex)
    // In a full implementation, this would create an internal MCP server with these tools
    const toolNames = Object.keys(academicTools);
    
    globalLogger.info(`[Academic Tools] Successfully prepared ${toolNames.length} tools for ${userData.name} (${userData.email})`);
    globalLogger.info(`[Academic Tools] Tools: ${toolNames.join(', ')}`);
    globalLogger.info(`[Academic Tools] User: ${userData.year} Level ${userData.currentSemester} Semester ${userData.major} student`);

    return {
      success: true,
      message: `Academic tools registered for ${userData.name}`,
      registeredTools: toolNames
    };

  } catch (error) {
    globalLogger.error(`[Academic Tools] Failed to register tools for user ${userId}:`, error);
    return {
      success: false,
      message: "Failed to register academic tools",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR"
    };
  }
}

/**
 * Auto-register academic tools when a student enrolls in a course
 * Called from enrollment workflow
 */
export async function autoRegisterOnEnrollment(userId: string, _courseId: string): Promise<void> {
  try {
    globalLogger.info(`[Academic Tools] Auto-registering tools for user ${userId} on course enrollment`);
    
    const result = await registerAcademicToolsForUser(userId);
    
    if (result.success) {
      globalLogger.info(`[Academic Tools] Auto-registration successful for user ${userId}`);
    } else {
      globalLogger.warn(`[Academic Tools] Auto-registration failed for user ${userId}: ${result.message}`);
    }
  } catch (error) {
    globalLogger.error(`[Academic Tools] Auto-registration error for user ${userId}:`, error);
  }
}

/**
 * Validate user access to academic tools
 * Called before tool execution to ensure proper permissions
 */
export async function validateAcademicToolAccess(
  userId: string, 
  toolName: string
): Promise<{
  hasAccess: boolean;
  reason?: string;
  userInfo?: any;
}> {
  try {
    // Check if it's a valid academic tool
    if (!Object.values(AcademicToolNames).includes(toolName as any)) {
      return {
        hasAccess: false,
        reason: "Invalid academic tool name"
      };
    }

    // Get user info
    const user = await pgDb
      .select({
        id: UserSchema.id,
        name: UserSchema.name,
        email: UserSchema.email,
        role: UserSchema.role,
        year: UserSchema.year,
        currentSemester: UserSchema.currentSemester,
        major: UserSchema.major
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (user.length === 0) {
      return {
        hasAccess: false,
        reason: "User not found"
      };
    }

    const userData = user[0];

    // Only students can access academic tools
    if (userData.role !== 'student') {
      return {
        hasAccess: false,
        reason: `Academic tools are only available for students. User role: ${userData.role}`,
        userInfo: userData
      };
    }

    return {
      hasAccess: true,
      userInfo: userData
    };

  } catch (error) {
    globalLogger.error(`[Academic Tools] Access validation error for user ${userId}:`, error);
    return {
      hasAccess: false,
      reason: "Access validation failed"
    };
  }
}

/**
 * Get academic tools status for a user
 * Useful for debugging and user support
 */
export async function getAcademicToolsStatus(userId: string): Promise<{
  user: any;
  hasAccess: boolean;
  availableTools: string[];
  enrollments: number;
  registrationStatus: string;
}> {
  try {
    // Get user info
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (user.length === 0) {
      return {
        user: null,
        hasAccess: false,
        availableTools: [],
        enrollments: 0,
        registrationStatus: "User not found"
      };
    }

    const userData = user[0];

    // Check enrollments
    const enrollments = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.studentId, userId));

    const hasAccess = userData.role === 'student';
    const availableTools = hasAccess ? Object.keys(academicTools) : [];

    let registrationStatus = "Not registered";
    if (hasAccess) {
      registrationStatus = enrollments.length > 0 ? 
        "Registered with course enrollments" : 
        "Registered but no course enrollments";
    } else {
      registrationStatus = `Not eligible (role: ${userData.role})`;
    }

    return {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        year: userData.year,
        currentSemester: userData.currentSemester,
        major: userData.major
      },
      hasAccess,
      availableTools,
      enrollments: enrollments.length,
      registrationStatus
    };

  } catch (error) {
    globalLogger.error(`[Academic Tools] Status check error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Log academic tool usage for analytics
 * Called after successful tool execution
 */
export function logAcademicToolUsage(
  userId: string, 
  toolName: string, 
  duration: number,
  success: boolean
): void {
  try {
    globalLogger.info(`[Academic Tools Usage] ${toolName} used by ${userId} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
    
    // In a full implementation, this would log to analytics database
    // For now, we just log to console for monitoring
    
  } catch (error) {
    globalLogger.error(`[Academic Tools] Usage logging error:`, error);
  }
}
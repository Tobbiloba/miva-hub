import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";

// Validation schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = passwordChangeSchema.parse(body);

    // Get current user with password
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await compare(
      validatedData.currentPassword, 
      user[0].password
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await compare(
      validatedData.newPassword, 
      user[0].password
    );

    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedNewPassword = await hash(validatedData.newPassword, 12);

    // Update password in database
    await pgDb
      .update(UserSchema)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('[Profile Password API] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
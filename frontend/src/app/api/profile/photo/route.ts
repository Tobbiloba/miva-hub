import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "No photo provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (2MB limit)
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 2MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = photo.name.split('.').pop() || 'jpg';
    const fileName = `${session.user.id}_${timestamp}.${fileExtension}`;
    
    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, which is fine
    }

    // Save file to disk
    const filePath = join(uploadDir, fileName);
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // Update user avatar in database
    const avatarUrl = `/uploads/avatars/${fileName}`;
    
    await pgDb
      .update(UserSchema)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, session.user.id));

    return NextResponse.json({
      success: true,
      data: { avatarUrl },
      message: "Profile photo updated successfully"
    });

  } catch (error) {
    console.error('[Profile Photo API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Remove avatar from database (set to null)
    await pgDb
      .update(UserSchema)
      .set({
        avatar: null,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Profile photo removed successfully"
    });

  } catch (error) {
    console.error('[Profile Photo API] DELETE Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to remove photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
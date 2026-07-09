import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  StudentEnrollmentSchema,
} from "@/lib/db/pg/schema.pg";
import { recordActivity } from "@/lib/progress/record-activity";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: materialId } = await params;

    // Fetch the material to get courseId, weekNumber, materialType
    const [material] = await pgDb
      .select({
        id: CourseMaterialSchema.id,
        courseId: CourseMaterialSchema.courseId,
        weekNumber: CourseMaterialSchema.weekNumber,
        materialType: CourseMaterialSchema.materialType,
        title: CourseMaterialSchema.title,
      })
      .from(CourseMaterialSchema)
      .where(eq(CourseMaterialSchema.id, materialId))
      .limit(1);

    if (!material) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 },
      );
    }

    // Verify student is enrolled in this course
    const [enrollment] = await pgDb
      .select({ id: StudentEnrollmentSchema.id })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, session.user.id),
          eq(StudentEnrollmentSchema.courseId, material.courseId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Not enrolled in this course" },
        { status: 403 },
      );
    }

    // Determine activity type based on material type
    const quizTypes = ["quiz", "exam"];
    const assignmentTypes = ["assignment", "assignment_external"];
    let activityType: "material_viewed" | "quiz_viewed" | "assignment_viewed" =
      "material_viewed";
    if (quizTypes.includes(material.materialType)) {
      activityType = "quiz_viewed";
    } else if (assignmentTypes.includes(material.materialType)) {
      activityType = "assignment_viewed";
    }

    // recordActivity handles daily dedup internally
    await recordActivity({
      studentId: session.user.id,
      activityType,
      courseId: material.courseId,
      weekNumber: material.weekNumber,
      entityId: materialId,
      entityMetadata: {
        materialType: material.materialType,
        title: material.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/materials/[id]/view error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

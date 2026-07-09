import {
  checkCourseInstructorAccess,
  requireFaculty,
} from "@/lib/auth/faculty";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AssignmentSchema,
  AssignmentSubmissionSchema,
  CourseSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  totalPoints: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  allowLateSubmission: z.boolean().optional(),
  lateSubmissionPenalty: z.number().min(0).max(100).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { id } = await params;

    const [assignment] = await pgDb
      .select({
        assignment: AssignmentSchema,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
      })
      .from(AssignmentSchema)
      .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
      .where(eq(AssignmentSchema.id, id))
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(
      session.user.id,
      assignment.assignment.courseId,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch assignment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { id } = await params;
    const body = await request.json();
    const validated = updateAssignmentSchema.parse(body);

    // Fetch existing assignment
    const [existing] = await pgDb
      .select()
      .from(AssignmentSchema)
      .where(eq(AssignmentSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(
      session.user.id,
      existing.courseId,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate due date if provided
    if (validated.dueDate) {
      const dueDate = new Date(validated.dueDate);
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid due date format" },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.instructions !== undefined)
      updateData.instructions = validated.instructions;
    if (validated.totalPoints !== undefined)
      updateData.totalPoints = validated.totalPoints;
    if (validated.dueDate !== undefined)
      updateData.dueDate = new Date(validated.dueDate);
    if (validated.isPublished !== undefined)
      updateData.isPublished = validated.isPublished;
    if (validated.allowLateSubmission !== undefined)
      updateData.allowLateSubmission = validated.allowLateSubmission;
    if (validated.lateSubmissionPenalty !== undefined)
      updateData.lateSubmissionPenalty =
        validated.lateSubmissionPenalty.toString();

    const [updated] = await pgDb
      .update(AssignmentSchema)
      .set(updateData)
      .where(eq(AssignmentSchema.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Assignment updated",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "Failed to update assignment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { id } = await params;

    const [existing] = await pgDb
      .select()
      .from(AssignmentSchema)
      .where(eq(AssignmentSchema.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    const hasAccess = await checkCourseInstructorAccess(
      session.user.id,
      existing.courseId,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check for existing submissions
    const [submissionCount] = await pgDb
      .select({ count: sql<number>`count(*)` })
      .from(AssignmentSubmissionSchema)
      .where(eq(AssignmentSubmissionSchema.assignmentId, id));

    if (Number(submissionCount.count) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${submissionCount.count} student submissions exist. Unpublish it instead.`,
        },
        { status: 400 },
      );
    }

    await pgDb.delete(AssignmentSchema).where(eq(AssignmentSchema.id, id));

    return NextResponse.json({ success: true, message: "Assignment deleted" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete assignment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

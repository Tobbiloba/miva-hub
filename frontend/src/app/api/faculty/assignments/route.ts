import { NextRequest, NextResponse } from "next/server";
import { requireFaculty, checkCourseInstructorAccess } from "@/lib/auth/faculty";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AssignmentSchema,
  CourseSchema,
  CourseInstructorSchema,
  FacultySchema,
} from "@/lib/db/pg/schema.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  instructions: z.string().optional().default(""),
  courseId: z.string().uuid("Invalid course ID"),
  assignmentType: z
    .enum(["homework", "project", "quiz", "exam", "presentation", "lab", "essay"])
    .default("homework"),
  totalPoints: z.number().int().positive("Points must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  submissionType: z
    .enum(["file_upload", "text_entry", "online_test", "in_person"])
    .default("file_upload"),
  allowLateSubmission: z.boolean().default(false),
  lateSubmissionPenalty: z.number().min(0).max(100).default(10),
  weekNumber: z.number().int().positive().optional(),
  moduleNumber: z.number().int().positive().optional(),
  isPublished: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(session.user.id);
    if (!facultyRecord) {
      return NextResponse.json({ error: "Faculty record not found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const assignments = await pgAcademicRepository.getFacultyAssignments(
      facultyRecord.id,
      courseId || undefined
    );

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch assignments", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const body = await request.json();
    const validated = createAssignmentSchema.parse(body);

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(session.user.id, validated.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You are not assigned to teach this course" },
        { status: 403 }
      );
    }

    // Validate due date is in the future
    const dueDate = new Date(validated.dueDate);
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date format" }, { status: 400 });
    }
    if (dueDate <= new Date()) {
      return NextResponse.json({ error: "Due date must be in the future" }, { status: 400 });
    }

    const [assignment] = await pgDb
      .insert(AssignmentSchema)
      .values({
        courseId: validated.courseId,
        title: validated.title,
        description: validated.description,
        instructions: validated.instructions,
        assignmentType: validated.assignmentType,
        totalPoints: validated.totalPoints,
        dueDate,
        submissionType: validated.submissionType,
        allowLateSubmission: validated.allowLateSubmission,
        lateSubmissionPenalty: validated.lateSubmissionPenalty.toString(),
        weekNumber: validated.weekNumber ?? null,
        moduleNumber: validated.moduleNumber ?? null,
        isPublished: validated.isPublished,
        createdById: session.user.id,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: assignment, message: "Assignment created" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create assignment", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

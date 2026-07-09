import { resolveSubmissionFileUrl } from "@/lib/ai/agents/submission-grader";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  AIDecisionSchema,
  AssignmentSchema,
  AssignmentSubmissionSchema,
  CourseInstructorSchema,
  CourseSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Pending AI grading suggestions for courses this faculty member teaches.
 * Tenant scoping is structural: the course_instructor join (facultyId from
 * the session) restricts results to the faculty's own courses/university.
 */
export async function GET() {
  try {
    const session = await getSession();
    const facultyInfo = getFacultyInfo(session);

    if (!facultyInfo) {
      return NextResponse.json(
        { error: "Faculty authentication required" },
        { status: 401 },
      );
    }

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(
      facultyInfo.id,
    );

    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 404 },
      );
    }

    const rows = await pgDb
      .select({
        decision: {
          id: AIDecisionSchema.id,
          actor: AIDecisionSchema.actor,
          confidence: AIDecisionSchema.confidence,
          reasoning: AIDecisionSchema.reasoning,
          metadata: AIDecisionSchema.metadata,
          createdAt: AIDecisionSchema.createdAt,
        },
        submission: {
          id: AssignmentSubmissionSchema.id,
          submittedAt: AssignmentSubmissionSchema.submittedAt,
          isLateSubmission: AssignmentSubmissionSchema.isLateSubmission,
          fileUrl: AssignmentSubmissionSchema.fileUrl,
          fileName: AssignmentSubmissionSchema.fileName,
          mimeType: AssignmentSubmissionSchema.mimeType,
          submissionText: AssignmentSubmissionSchema.submissionText,
        },
        assignment: {
          id: AssignmentSchema.id,
          title: AssignmentSchema.title,
          totalPoints: AssignmentSchema.totalPoints,
        },
        course: {
          id: CourseSchema.id,
          courseCode: CourseSchema.courseCode,
          title: CourseSchema.title,
        },
        student: {
          id: UserSchema.id,
          name: UserSchema.name,
        },
      })
      .from(AIDecisionSchema)
      .innerJoin(
        AssignmentSubmissionSchema,
        eq(AIDecisionSchema.subjectId, AssignmentSubmissionSchema.id),
      )
      .innerJoin(
        AssignmentSchema,
        eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id),
      )
      .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
      .innerJoin(
        CourseInstructorSchema,
        eq(CourseSchema.id, CourseInstructorSchema.courseId),
      )
      .innerJoin(
        UserSchema,
        eq(AssignmentSubmissionSchema.studentId, UserSchema.id),
      )
      .where(
        and(
          eq(AIDecisionSchema.decisionType, "grading"),
          eq(AIDecisionSchema.status, "pending_review"),
          eq(AIDecisionSchema.subjectType, "assignment_submission"),
          eq(CourseInstructorSchema.facultyId, facultyRecord.id),
        ),
      )
      .orderBy(desc(AIDecisionSchema.createdAt))
      .limit(50);

    // Short-TTL signed photo URLs for preview
    const items = await Promise.all(
      rows.map(async (row) => {
        let photoUrl: string | null = null;
        if (row.submission.fileUrl) {
          const resolved = await resolveSubmissionFileUrl(
            row.submission.fileUrl,
            300,
          );
          photoUrl = resolved?.toString() ?? null;
        }
        const { fileUrl: _fileUrl, ...submission } = row.submission;
        return { ...row, submission, photoUrl };
      }),
    );

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Error fetching AI grading review queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

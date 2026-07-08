import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCourseInstructor } from "@/lib/academic/lecture-study";
import { recordAIDecision } from "@/lib/ai/decision-ledger";
import {
  PROFESSOR_MODEL,
  generateOutreachMessage,
  getOrCreateProfessor,
  scanStrugglingStudents,
} from "@/lib/ai/professor";
import { requireFaculty } from "@/lib/auth/faculty";
import {
  createNotification,
  existsTodayForStudent,
} from "@/lib/notifications/generators/helpers";
import { sendWhatsAppText, whatsappConfigured } from "@/lib/whatsapp";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, WhatsAppLinkSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Professor Outreach: " });

export const maxDuration = 300;

const bodySchema = z.object({ courseId: z.string().uuid() });

/**
 * POST /api/professor/outreach/run — the AI professor scans the course for
 * struggling students and sends each a personalized, in-character check-in
 * (in-app notification + WhatsApp when linked). Instructor-triggered; the
 * same handler is cron-ready later.
 */
export async function POST(request: Request) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 },
      );
    }
    const { courseId } = parsed.data;

    // Authorization from the session: only this course's instructor may run it
    if (!(await isCourseInstructor(session.user.id, courseId))) {
      return NextResponse.json(
        { error: "You are not an instructor of this course" },
        { status: 403 },
      );
    }

    const [course] = await pgDb
      .select({
        universityId: CourseSchema.universityId,
        courseCode: CourseSchema.courseCode,
        title: CourseSchema.title,
      })
      .from(CourseSchema)
      .where(eq(CourseSchema.id, courseId))
      .limit(1);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const professor = await getOrCreateProfessor(courseId);
    if (!professor) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const signals = await scanStrugglingStudents(courseId);
    let notified = 0;
    let skipped = 0;
    const results: {
      studentName: string;
      reasons: string[];
      channels: string[];
    }[] = [];

    for (const signal of signals) {
      // One outreach per student+course per day
      if (
        await existsTodayForStudent(
          signal.studentId,
          "professor_outreach",
          courseId,
        )
      ) {
        skipped++;
        continue;
      }

      const message = await generateOutreachMessage(professor, course, signal);
      const channels = ["in_app"];

      await createNotification({
        studentId: signal.studentId,
        type: "professor_outreach",
        title: `${professor.name} checked in on you`,
        body: message,
        entityUrl: `/student/professor?courseId=${courseId}`,
        entityId: courseId,
        entityMetadata: {
          courseCode: course.courseCode,
          professorName: professor.name,
          reasons: signal.reasons,
        },
      });

      // WhatsApp delivery when the student has a verified link
      if (whatsappConfigured()) {
        const [link] = await pgDb
          .select({ phoneNumber: WhatsAppLinkSchema.phoneNumber })
          .from(WhatsAppLinkSchema)
          .where(
            and(
              eq(WhatsAppLinkSchema.userId, signal.studentId),
              isNotNull(WhatsAppLinkSchema.verifiedAt),
            ),
          )
          .limit(1);
        if (link?.phoneNumber) {
          const sent = await sendWhatsAppText(
            link.phoneNumber,
            `${message}\n\n— ${professor.name}, ${course.courseCode} (Askly)`,
          );
          if (sent) channels.push("whatsapp");
        }
      }

      await recordAIDecision({
        universityId: course.universityId ?? null,
        decisionType: "support",
        actor: "ai-professor",
        subjectType: "student",
        subjectId: signal.studentId,
        userId: signal.studentId,
        model: PROFESSOR_MODEL,
        inputSummary: `Struggle signals (${course.courseCode}): ${signal.reasons.join("; ")}`,
        decision: `action: proactive check-in sent via ${channels.join("+")} as ${professor.name}`,
        confidence: 0.9,
        status: "executed",
        metadata: { feature: "ai-professor", channels },
      }).catch((error) => logger.warn("ledger write failed", error));

      notified++;
      results.push({
        studentName: signal.studentName,
        reasons: signal.reasons,
        channels,
      });
    }

    return NextResponse.json({
      professor: professor.name,
      flagged: signals.length,
      notified,
      skippedAlreadyContactedToday: skipped,
      results,
    });
  } catch (error) {
    logger.error("outreach run failed", error);
    return NextResponse.json({ error: "Outreach run failed" }, { status: 500 });
  }
}

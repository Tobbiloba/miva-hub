/**
 * Demo Seed — Struggle→Recovery Arc Student (Emeka Nwosu)
 *
 * The pitch-narrative student: shaky 100L year, failing COS201 in weeks 2-4
 * (42 → 51 → 58), starts using Askly's AI tutor around week 5, recovers to
 * 71 → 84 → 91 (AI-graded, human-approved in the decision ledger), builds a
 * 12-day study streak, passes an AI viva and earns a verifiable
 * micro-credential.
 *
 * ADDITIVE ONLY — never deletes or truncates. Idempotent: re-runs refresh the
 * same rows (natural keys where the schema has them, `seedTag` markers in
 * JSON columns where it doesn't).
 *
 * Run: npx tsx scripts/seed-recovery-arc.ts
 * Login: emeka.nwosu@miva.edu.ng / TestPass123!
 */
import "load-env";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  AccountSchema,
  AIDecisionSchema,
  AssignmentSchema,
  AssignmentSubmissionSchema,
  ConceptMasterySchema,
  CourseMaterialSchema,
  CourseSchema,
  FlashcardDeckSchema,
  FlashcardSchema,
  MicroCredentialSchema,
  NotificationSchema,
  ProgramSchema,
  StudentEnrollmentSchema,
  StudentStudySessionsSchema,
  StudyActivitySchema,
  StudyPlanSchema,
  UniversitySchema,
  UserSchema,
  VivaSessionSchema,
} from "lib/db/pg/schema.pg";

const SEED_TAG = "recovery-arc";
const STUDENT_EMAIL = "emeka.nwosu@miva.edu.ng";
const FACULTY_EMAIL = "adebayo.olumide@miva.edu.ng";
const ARC_COURSE = "COS201";

const daysAgo = (n: number, hour = 14) => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

// ─── Static definitions ───────────────────────────────────────────────────────

// 100L history: a genuinely shaky first year (CGPA ~3.13, 2:2 territory)
const COMPLETED_100L: Array<{
  code: string;
  semester: "first" | "second";
  grade: string;
  points: string;
}> = [
  { code: "COS101", semester: "first", grade: "C", points: "3.00" },
  { code: "MTH101", semester: "first", grade: "D", points: "2.00" },
  { code: "GST111", semester: "first", grade: "B", points: "4.00" },
  { code: "PHY101", semester: "first", grade: "C", points: "3.00" },
  { code: "COS102", semester: "second", grade: "C", points: "3.00" },
  { code: "MTH102", semester: "second", grade: "C", points: "3.00" },
  { code: "GST122", semester: "second", grade: "B", points: "4.00" },
  { code: "PHY102", semester: "second", grade: "C", points: "3.00" },
];

const CURRENT_200L = ["COS201", "COS203", "COS205", "MTH201", "GST112"];

// The COS201 arc: 3 human-graded failures, then 3 AI-graded recoveries
const ARC_ASSIGNMENTS: Array<{
  title: string;
  type: "homework" | "quiz" | "project";
  week: number;
  dueDaysAgo: number;
  grade: string;
  late: boolean;
  aiGraded: boolean;
  confidence?: number;
  feedback: string;
}> = [
  {
    title: "Week 2 Problem Set — Recursion Foundations",
    type: "homework",
    week: 2,
    dueDaysAgo: 56,
    grade: "42.00",
    late: false,
    aiGraded: false,
    feedback:
      "Base cases are missing in 3 of 4 solutions, so the recursion never terminates. Revisit the week 2 lecture on termination conditions before the next set.",
  },
  {
    title: "Week 3 Quiz — Stacks & Queues",
    type: "quiz",
    week: 3,
    dueDaysAgo: 49,
    grade: "51.00",
    late: false,
    aiGraded: false,
    feedback:
      "You know the definitions but confused LIFO/FIFO under time pressure. Practice tracing push/pop sequences by hand.",
  },
  {
    title: "Week 4 Problem Set — Linked List Implementation",
    type: "homework",
    week: 4,
    dueDaysAgo: 42,
    grade: "58.00",
    late: true,
    aiGraded: false,
    feedback:
      "Insertion works, deletion loses the tail pointer. Submitted late. Please come to office hours or use the AI professor — you are close but the pointer manipulation needs practice.",
  },
  {
    title: "Week 6 Problem Set — Binary Trees & Traversal",
    type: "homework",
    week: 6,
    dueDaysAgo: 28,
    grade: "71.00",
    late: false,
    aiGraded: true,
    confidence: 0.81,
    feedback:
      "Clear improvement: all three traversals correct and the recursion is clean. Lost points on the balanced-insert edge case (empty subtree). Keep going.",
  },
  {
    title: "Week 7 Quiz — Sorting Algorithm Analysis",
    type: "quiz",
    week: 7,
    dueDaysAgo: 21,
    grade: "84.00",
    late: false,
    aiGraded: true,
    confidence: 0.88,
    feedback:
      "Strong quiz. Correct Big-O for all five algorithms and a good justification for merge sort's stability. One slip on quicksort's worst-case pivot choice.",
  },
  {
    title: "Week 9 Project — Mini Data-Structure Library",
    type: "project",
    week: 9,
    dueDaysAgo: 7,
    grade: "91.00",
    late: false,
    aiGraded: true,
    confidence: 0.92,
    feedback:
      "Excellent work. Well-tested stack, queue and BST with documented complexity guarantees. This is distinction-level code compared to your week 2 submission.",
  },
];

const CONCEPTS: Array<{
  name: string;
  mastery: string;
  correct: number;
  total: number;
  lastPracticedDaysAgo: number;
}> = [
  { name: "Recursion", mastery: "0.88", correct: 24, total: 30, lastPracticedDaysAgo: 1 },
  { name: "Linked Lists", mastery: "0.92", correct: 22, total: 24, lastPracticedDaysAgo: 2 },
  { name: "Stacks & Queues", mastery: "0.83", correct: 19, total: 23, lastPracticedDaysAgo: 3 },
  { name: "Big-O Analysis", mastery: "0.81", correct: 17, total: 21, lastPracticedDaysAgo: 1 },
  { name: "Sorting Algorithms", mastery: "0.86", correct: 18, total: 21, lastPracticedDaysAgo: 4 },
  { name: "Dynamic Programming", mastery: "0.42", correct: 8, total: 19, lastPracticedDaysAgo: 0 },
];

const FLASHCARDS: Array<{
  front: string;
  back: string;
  reviews: number;
  interval: number;
  dueInDays: number; // negative/zero = due now
  lapses: number;
}> = [
  { front: "What two things does every correct recursive function need?", back: "A base case that terminates, and a recursive step that moves toward it.", reviews: 6, interval: 8, dueInDays: 5, lapses: 1 },
  { front: "Stack order vs queue order?", back: "Stack is LIFO (last in, first out); queue is FIFO (first in, first out).", reviews: 5, interval: 8, dueInDays: 4, lapses: 1 },
  { front: "Time complexity of search in a balanced BST?", back: "O(log n) — each comparison halves the remaining search space.", reviews: 4, interval: 4, dueInDays: 0, lapses: 0 },
  { front: "Why is merge sort stable but quicksort typically not?", back: "Merge sort preserves relative order when merging equal keys; quicksort's partitioning swaps across the pivot.", reviews: 3, interval: 4, dueInDays: 0, lapses: 0 },
  { front: "Deleting a node from a singly linked list: what pointer must you keep?", back: "The previous node's pointer — you re-link prev.next to node.next before dropping the node.", reviews: 5, interval: 8, dueInDays: 6, lapses: 2 },
  { front: "Two properties a problem needs for dynamic programming?", back: "Optimal substructure and overlapping subproblems.", reviews: 1, interval: 1, dueInDays: 0, lapses: 1 },
  { front: "Memoization vs tabulation?", back: "Memoization is top-down caching of recursive calls; tabulation is bottom-up filling of a table.", reviews: 1, interval: 1, dueInDays: -1, lapses: 0 },
  { front: "In-order traversal of a BST yields what?", back: "The keys in sorted ascending order.", reviews: 4, interval: 4, dueInDays: 2, lapses: 0 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding recovery-arc demo student (additive, idempotent)…\n");

  // ── Lookups ──────────────────────────────────────────────────────────────
  const [program] = await db
    .select()
    .from(ProgramSchema)
    .where(eq(ProgramSchema.code, "CS"))
    .limit(1);
  if (!program) throw new Error("Program CS not found — run seed-demo-data.ts first");

  const [university] = await db
    .select()
    .from(UniversitySchema)
    .where(eq(UniversitySchema.slug, "miva"))
    .limit(1);
  if (!university) throw new Error("University 'miva' not found");

  const [faculty] = await db
    .select()
    .from(UserSchema)
    .where(eq(UserSchema.email, FACULTY_EMAIL))
    .limit(1);
  if (!faculty) throw new Error(`Faculty ${FACULTY_EMAIL} not found — run seed-demo-data.ts first`);

  const allCodes = [
    ...new Set([...COMPLETED_100L.map((c) => c.code), ...CURRENT_200L]),
  ];
  const courses = await db
    .select()
    .from(CourseSchema)
    .where(inArray(CourseSchema.courseCode, allCodes));
  const courseByCode = new Map(courses.map((c) => [c.courseCode, c]));
  const missing = allCodes.filter((c) => !courseByCode.has(c));
  if (missing.length) throw new Error(`Missing courses: ${missing.join(", ")}`);
  const arcCourse = courseByCode.get(ARC_COURSE)!;

  console.log(`✅ Lookups OK — ${university.name}, ${program.code}, faculty ${faculty.name}\n`);

  // ── 1. Student upsert ────────────────────────────────────────────────────
  const hashed = await hashPassword("TestPass123!");
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const studentFields = {
    name: "Emeka Nwosu",
    studentId: "MIVA/CS/2024/004",
    role: "student" as const,
    currentLevel: 200,
    currentSemester: "first",
    academicYear: "2025-2026",
    enrollmentStatus: "active" as const,
    programId: program.id,
    admissionSession: "2024-2025",
    admissionLevel: 100,
    emailVerified: true,
    universityId: university.id,
    trialStartedAt,
    trialEndsAt,
  };

  let studentId: string;
  const [existingUser] = await db
    .select()
    .from(UserSchema)
    .where(eq(UserSchema.email, STUDENT_EMAIL))
    .limit(1);

  if (existingUser) {
    await db
      .update(UserSchema)
      .set(studentFields)
      .where(eq(UserSchema.id, existingUser.id));
    studentId = existingUser.id;
    console.log(`⏭️  Student exists — updated (${studentId})`);
  } else {
    studentId = crypto.randomUUID();
    await db.insert(UserSchema).values({
      id: studentId,
      email: STUDENT_EMAIL,
      password: hashed,
      ...studentFields,
    });
    await db.insert(AccountSchema).values({
      accountId: studentId,
      providerId: "credential",
      userId: studentId,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Student created (${studentId})`);
  }

  // ── 2. Enrollments ───────────────────────────────────────────────────────
  const enrollmentDefs = [
    ...COMPLETED_100L.map((c) => ({
      code: c.code,
      semester: c.semester,
      academicYear: "2024-2025",
      status: "completed" as const,
      finalGrade: c.grade,
      gradePoints: c.points,
    })),
    ...CURRENT_200L.map((code) => ({
      code,
      semester: "first" as const,
      academicYear: "2025-2026",
      status: "enrolled" as const,
      finalGrade: undefined,
      gradePoints: undefined,
    })),
  ];

  let enrCreated = 0;
  for (const enr of enrollmentDefs) {
    const course = courseByCode.get(enr.code)!;
    const [exists] = await db
      .select({ id: StudentEnrollmentSchema.id })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, studentId),
          eq(StudentEnrollmentSchema.courseId, course.id),
          eq(StudentEnrollmentSchema.semester, enr.semester),
          eq(StudentEnrollmentSchema.academicYear, enr.academicYear),
        ),
      )
      .limit(1);
    if (exists) continue;
    await db.insert(StudentEnrollmentSchema).values({
      studentId,
      courseId: course.id,
      semester: enr.semester,
      academicYear: enr.academicYear,
      status: enr.status,
      finalGrade: enr.finalGrade ?? null,
      gradePoints: enr.gradePoints ?? null,
    });
    enrCreated++;
  }
  console.log(`📚 Enrollments: ${enrCreated} created, ${enrollmentDefs.length - enrCreated} existing`);

  // ── 3. Arc assignments + submissions + ledger ────────────────────────────
  let subUpserts = 0;
  let ledgerCreated = 0;
  for (const a of ARC_ASSIGNMENTS) {
    // Assignment: natural key (courseId, title)
    let [assignment] = await db
      .select()
      .from(AssignmentSchema)
      .where(
        and(
          eq(AssignmentSchema.courseId, arcCourse.id),
          eq(AssignmentSchema.title, a.title),
        ),
      )
      .limit(1);

    if (!assignment) {
      [assignment] = await db
        .insert(AssignmentSchema)
        .values({
          courseId: arcCourse.id,
          title: a.title,
          description: `${ARC_COURSE} week ${a.week} ${a.type}.`,
          assignmentType: a.type === "project" ? "project" : a.type,
          totalPoints: "100.00",
          dueDate: daysAgo(a.dueDaysAgo, 23),
          submissionType: "file_upload",
          allowLateSubmission: true,
          lateSubmissionPenalty: "10.00",
          weekNumber: a.week,
          isPublished: true,
          createdById: faculty.id,
        })
        .returning();
    }

    // Submission: unique (assignmentId, studentId) — refresh on re-run
    const submittedAt = daysAgo(a.dueDaysAgo + (a.late ? -1 : 1), 18);
    const gradedAt = daysAgo(a.dueDaysAgo - 2, 10);
    const subValues = {
      submissionText: null,
      fileUrl: null,
      fileName: `${ARC_COURSE.toLowerCase()}-week${a.week}-emeka-nwosu.pdf`,
      fileSize: 240_000 + a.week * 13_337,
      mimeType: "application/pdf",
      grade: a.grade,
      feedback: a.feedback,
      isLateSubmission: a.late,
      submittedAt,
      gradedAt,
      gradedById: faculty.id,
    };

    let [submission] = await db
      .select()
      .from(AssignmentSubmissionSchema)
      .where(
        and(
          eq(AssignmentSubmissionSchema.assignmentId, assignment.id),
          eq(AssignmentSubmissionSchema.studentId, studentId),
        ),
      )
      .limit(1);

    if (submission) {
      await db
        .update(AssignmentSubmissionSchema)
        .set(subValues)
        .where(eq(AssignmentSubmissionSchema.id, submission.id));
    } else {
      [submission] = await db
        .insert(AssignmentSubmissionSchema)
        .values({ assignmentId: assignment.id, studentId, ...subValues })
        .returning();
    }
    subUpserts++;

    // Ledger entry for AI-graded submissions: keyed by subjectId
    if (a.aiGraded) {
      const [existingDecision] = await db
        .select({ id: AIDecisionSchema.id })
        .from(AIDecisionSchema)
        .where(
          and(
            eq(AIDecisionSchema.subjectType, "assignment_submission"),
            eq(AIDecisionSchema.subjectId, submission.id),
          ),
        )
        .limit(1);
      if (!existingDecision) {
        await db.insert(AIDecisionSchema).values({
          universityId: university.id,
          decisionType: "grading",
          actor: "snap-grading-agent",
          subjectType: "assignment_submission",
          subjectId: submission.id,
          userId: studentId,
          model: "gemini-2.5-flash",
          inputSummary: `Rubric-based grading of "${a.title}" (${ARC_COURSE}), PDF submission`,
          decision: `grade: ${Number.parseFloat(a.grade)}/100`,
          reasoning: a.feedback,
          confidence: a.confidence,
          status: "approved",
          reviewedById: faculty.id,
          reviewedAt: gradedAt,
          metadata: { seedTag: SEED_TAG, week: a.week },
          createdAt: gradedAt,
        });
        ledgerCreated++;
      }
    }
  }
  console.log(`📝 Assignments/submissions: ${subUpserts} upserted; ledger entries: ${ledgerCreated} created`);

  // ── 4. Concept mastery (unique studentId+courseId+conceptName) ───────────
  let conceptUpserts = 0;
  for (const c of CONCEPTS) {
    const values = {
      masteryLevel: c.mastery,
      correctAttempts: c.correct,
      totalAttempts: c.total,
      lastPracticedAt: daysAgo(c.lastPracticedDaysAgo, 20),
      firstLearnedAt: daysAgo(40, 16),
    };
    const [exists] = await db
      .select({ id: ConceptMasterySchema.id })
      .from(ConceptMasterySchema)
      .where(
        and(
          eq(ConceptMasterySchema.studentId, studentId),
          eq(ConceptMasterySchema.courseId, arcCourse.id),
          eq(ConceptMasterySchema.conceptName, c.name),
        ),
      )
      .limit(1);
    if (exists) {
      await db
        .update(ConceptMasterySchema)
        .set(values)
        .where(eq(ConceptMasterySchema.id, exists.id));
    } else {
      await db.insert(ConceptMasterySchema).values({
        studentId,
        courseId: arcCourse.id,
        conceptName: c.name,
        ...values,
      });
    }
    conceptUpserts++;
  }
  console.log(`🧠 Concept mastery: ${conceptUpserts} upserted (DP left weak on purpose)`);

  // ── 5. Flashcard deck + cards ────────────────────────────────────────────
  const deckTitle = "COS201 · Data Structures Essentials";
  let [deck] = await db
    .select()
    .from(FlashcardDeckSchema)
    .where(
      and(
        eq(FlashcardDeckSchema.studentId, studentId),
        eq(FlashcardDeckSchema.courseId, arcCourse.id),
        eq(FlashcardDeckSchema.title, deckTitle),
      ),
    )
    .limit(1);

  if (!deck) {
    [deck] = await db
      .insert(FlashcardDeckSchema)
      .values({
        studentId,
        courseId: arcCourse.id,
        weekNumber: 9,
        title: deckTitle,
        sourceMaterialIds: [],
        cardCount: FLASHCARDS.length,
      })
      .returning();
    for (const card of FLASHCARDS) {
      const lastReviewedAt = card.reviews > 0 ? daysAgo(Math.max(card.interval - card.dueInDays, 0), 21) : null;
      await db.insert(FlashcardSchema).values({
        deckId: deck.id,
        front: card.front,
        back: card.back,
        lastReviewedAt,
        nextDueAt: daysAgo(-card.dueInDays, 9), // dueInDays<=0 → already due
        intervalDays: card.interval,
        reviewCount: card.reviews,
        lapseCount: card.lapses,
        lastRating: card.lapses > 0 && card.reviews <= 1 ? "again" : "good",
      });
    }
    console.log(`🃏 Flashcards: deck + ${FLASHCARDS.length} cards created (3 due today)`);
  } else {
    console.log("🃏 Flashcards: deck exists — skipped");
  }

  // ── 6. Study plan (unique studentId+courseId) ────────────────────────────
  const planValues = {
    weeklyGoal:
      "Lift Dynamic Programming from weak to passing before the Week 11 mock exam, while keeping recursion and trees warm.",
    rationale:
      "Your graded average has climbed from 42% to 91% over seven weeks — the recovery is real. The one concept still holding you back is Dynamic Programming (42% mastery, 8/19 attempts). This week trades some flashcard time for two focused DP tutor sessions and one practice quiz.",
    focusConcepts: ["Dynamic Programming", "Memoization vs Tabulation", "Recursion"],
    days: [
      {
        day: "Monday",
        tasks: [
          { type: "tutor_session" as const, title: "DP foundations with the AI professor", description: "Work through optimal substructure and overlapping subproblems with two worked examples (fibonacci, coin change).", concepts: ["Dynamic Programming"], estimatedMinutes: 35 },
        ],
      },
      {
        day: "Tuesday",
        tasks: [
          { type: "flashcards" as const, title: "Clear due cards", description: "3 cards are due, including both DP cards you lapsed on.", concepts: ["Dynamic Programming", "Sorting Algorithms"], estimatedMinutes: 15 },
        ],
      },
      {
        day: "Wednesday",
        tasks: [
          { type: "practice_quiz" as const, title: "DP practice quiz", description: "5 questions: 2 memoization traces, 2 tabulation table fills, 1 complexity analysis.", concepts: ["Dynamic Programming", "Big-O Analysis"], estimatedMinutes: 30 },
        ],
      },
      {
        day: "Friday",
        tasks: [
          { type: "tutor_session" as const, title: "Knapsack walkthrough", description: "Apply the DP recipe to 0/1 knapsack end-to-end, then explain it back in your own words.", concepts: ["Dynamic Programming"], estimatedMinutes: 40 },
        ],
      },
      {
        day: "Sunday",
        tasks: [
          { type: "reading" as const, title: "Week 10 pre-read: graph representations", description: "Skim adjacency lists vs matrices before Monday's lecture so the new material lands on familiar ground.", concepts: ["Graphs"], estimatedMinutes: 25 },
        ],
      },
    ],
    signalsSummary:
      "average graded score 66.2% over 6 submissions (trend: 42 → 91); weak concepts: Dynamic Programming (42%); strong concepts: Linked Lists, Recursion, Sorting Algorithms; 3/8 flashcards due; last activity 0 day(s) ago; 165 study minutes in last 7 days",
    model: "gemini-2.5-flash",
    generatedAt: daysAgo(1, 7),
  };

  const [existingPlan] = await db
    .select({ id: StudyPlanSchema.id })
    .from(StudyPlanSchema)
    .where(
      and(
        eq(StudyPlanSchema.studentId, studentId),
        eq(StudyPlanSchema.courseId, arcCourse.id),
      ),
    )
    .limit(1);
  if (existingPlan) {
    await db
      .update(StudyPlanSchema)
      .set(planValues)
      .where(eq(StudyPlanSchema.id, existingPlan.id));
    console.log("🗓️  Study plan: refreshed");
  } else {
    await db.insert(StudyPlanSchema).values({
      studentId,
      courseId: arcCourse.id,
      ...planValues,
    });
    console.log("🗓️  Study plan: created");
  }

  // ── 7. Study sessions (seedTag guard) ────────────────────────────────────
  const [taggedSession] = await db
    .select({ id: StudentStudySessionsSchema.id })
    .from(StudentStudySessionsSchema)
    .where(
      and(
        eq(StudentStudySessionsSchema.studentId, studentId),
        sql`${StudentStudySessionsSchema.activityData}->>'seedTag' = ${SEED_TAG}`,
      ),
    )
    .limit(1);

  if (!taggedSession) {
    // Sparse before the turning point (~day 40), escalating after
    const sessionDays = [40, 38, 35, 33, 30, 28, 26, 23, 21, 19, 16, 12, 9, 7, 5, 4, 2, 1, 0];
    const types = ["chat", "flashcards", "quiz", "chat", "study_guide"] as const;
    let i = 0;
    for (const day of sessionDays) {
      const sessionType = types[i % types.length];
      const duration = day > 30 ? 15 + (i % 2) * 5 : 25 + (i % 3) * 10;
      const startedAt = daysAgo(day, 19);
      await db.insert(StudentStudySessionsSchema).values({
        studentId,
        courseId: arcCourse.id,
        sessionType,
        durationMinutes: duration,
        activityData: { seedTag: SEED_TAG },
        startedAt,
        endedAt: new Date(startedAt.getTime() + duration * 60_000),
      });
      i++;
    }
    console.log(`⏱️  Study sessions: ${sessionDays.length} created`);
  } else {
    console.log("⏱️  Study sessions: tagged rows exist — skipped");
  }

  // ── 8. Study activity — 12-day streak incl. today (seedTag guard) ────────
  const [taggedActivity] = await db
    .select({ id: StudyActivitySchema.id })
    .from(StudyActivitySchema)
    .where(
      and(
        eq(StudyActivitySchema.studentId, studentId),
        sql`${StudyActivitySchema.entityMetadata}->>'seedTag' = ${SEED_TAG}`,
      ),
    )
    .limit(1);

  if (!taggedActivity) {
    const materials = await db
      .select({ id: CourseMaterialSchema.id, weekNumber: CourseMaterialSchema.weekNumber })
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.courseId, arcCourse.id),
          eq(CourseMaterialSchema.isPublished, true),
        ),
      )
      .limit(12);

    const activityTypes = [
      "flashcard_reviewed",
      "material_viewed",
      "practice_questions_generated",
      "material_viewed",
      "study_guide_generated",
      "flashcard_reviewed",
    ] as const;

    let created = 0;
    for (let day = 11; day >= 0; day--) {
      // 1-2 activities per streak day
      const perDay = day % 3 === 0 ? 2 : 1;
      for (let k = 0; k < perDay; k++) {
        const type = activityTypes[(day + k) % activityTypes.length];
        const material =
          type === "material_viewed" && materials.length > 0
            ? materials[(day + k) % materials.length]
            : null;
        await db.insert(StudyActivitySchema).values({
          studentId,
          courseId: arcCourse.id,
          weekNumber: material?.weekNumber ?? 9 - Math.floor(day / 7),
          activityType: type,
          entityId: material?.id ?? null,
          entityMetadata: { seedTag: SEED_TAG },
          createdAt: daysAgo(day, 19 + k),
        });
        created++;
      }
    }
    console.log(`🔥 Study activity: ${created} rows → 12-day streak (${materials.length} real materials referenced)`);
  } else {
    console.log("🔥 Study activity: tagged rows exist — skipped");
  }

  // ── 9. Notifications (seedTag guard) ─────────────────────────────────────
  const [taggedNotif] = await db
    .select({ id: NotificationSchema.id })
    .from(NotificationSchema)
    .where(
      and(
        eq(NotificationSchema.studentId, studentId),
        sql`${NotificationSchema.entityMetadata}->>'seedTag' = ${SEED_TAG}`,
      ),
    )
    .limit(1);

  if (!taggedNotif) {
    await db.insert(NotificationSchema).values([
      {
        studentId,
        type: "streak_milestone",
        title: "7-day study streak! 🔥",
        body: "Seven days in a row on COS201. Your graded average is up 33 points since week 2 — keep the momentum.",
        entityUrl: "/student/progress",
        entityMetadata: { seedTag: SEED_TAG, streakDays: 7 },
        isRead: true,
        createdAt: daysAgo(5, 8),
        readAt: daysAgo(5, 9),
      },
      {
        studentId,
        type: "flashcards_due",
        title: "3 flashcards due",
        body: "Your Dynamic Programming cards are due for review — they're the weakest concept on your plan this week.",
        entityUrl: "/student/flashcards",
        entityMetadata: { seedTag: SEED_TAG },
        isRead: false,
        createdAt: daysAgo(0, 7),
      },
    ]);
    console.log("🔔 Notifications: 2 created");
  } else {
    console.log("🔔 Notifications: tagged rows exist — skipped");
  }

  // ── 10. Viva session + micro-credential ──────────────────────────────────
  const [existingViva] = await db
    .select({ id: VivaSessionSchema.id })
    .from(VivaSessionSchema)
    .where(
      and(
        eq(VivaSessionSchema.studentId, studentId),
        eq(VivaSessionSchema.courseId, arcCourse.id),
        eq(VivaSessionSchema.status, "completed"),
      ),
    )
    .limit(1);

  if (!existingViva) {
    const vivaStart = daysAgo(2, 15);
    await db.insert(VivaSessionSchema).values({
      studentId,
      courseId: arcCourse.id,
      status: "completed",
      focusTopic: "Data structures: recursion, trees and complexity analysis",
      transcript: [
        { role: "examiner", text: "Walk me through how you would detect a cycle in a linked list without extra memory." },
        { role: "student", text: "I'd use Floyd's tortoise and hare — two pointers, one moving one step, one moving two. If they ever meet, there's a cycle. It's O(n) time and O(1) space." },
        { role: "examiner", text: "Good. Why does the fast pointer meeting the slow one guarantee a cycle?" },
        { role: "student", text: "In a cycle the fast pointer gains one position per step on the slow one, so the gap shrinks to zero — they must meet. Without a cycle the fast pointer just hits null." },
        { role: "examiner", text: "Last one: your week 9 project used a BST. When does it degrade to O(n), and what fixes it?" },
        { role: "student", text: "If you insert sorted data it becomes a linked list — O(n) lookups. Self-balancing trees like AVL or red-black fix it by rotating to keep height logarithmic." },
      ],
      rubric: {
        criteria: [
          { name: "Conceptual understanding", score: 4, outOf: 5 },
          { name: "Reasoning under follow-up", score: 4, outOf: 5 },
          { name: "Communication", score: 4, outOf: 5 },
          { name: "Depth beyond the syllabus", score: 3, outOf: 5 },
        ],
      },
      overallScore: 78,
      model: "gemini-2.5-flash",
      startedAt: vivaStart,
      endedAt: new Date(vivaStart.getTime() + 14 * 60_000),
    });
    console.log("🎤 Viva session: created (completed, 78/100)");
  } else {
    console.log("🎤 Viva session: exists — skipped");
  }

  const [existingCred] = await db
    .select({
      id: MicroCredentialSchema.id,
      verificationCode: MicroCredentialSchema.verificationCode,
    })
    .from(MicroCredentialSchema)
    .where(
      and(
        eq(MicroCredentialSchema.studentId, studentId),
        eq(MicroCredentialSchema.courseId, arcCourse.id),
      ),
    )
    .limit(1);

  // /verify/[code] only accepts 16-64 hex chars — match the production format.
  if (existingCred && !/^[a-f0-9]{16,64}$/i.test(existingCred.verificationCode)) {
    const fixedCode = randomBytes(16).toString("hex");
    await db
      .update(MicroCredentialSchema)
      .set({ verificationCode: fixedCode })
      .where(eq(MicroCredentialSchema.id, existingCred.id));
    console.log(`🏅 Micro-credential: code format healed — /verify/${fixedCode}`);
  } else if (existingCred) {
    console.log(
      `🏅 Micro-credential: exists — /verify/${existingCred.verificationCode}`,
    );
  }

  if (!existingCred) {
    const verificationCode = randomBytes(16).toString("hex");
    await db.insert(MicroCredentialSchema).values({
      studentId,
      courseId: arcCourse.id,
      title: "Data Structures Fundamentals — COS201",
      summary:
        "Demonstrated proficient command of core data structures through graded coursework and a live oral examination, including recursion, linked structures, tree traversal and algorithmic complexity analysis.",
      overallLevel: "proficient",
      competencies: [
        { name: "Recursion & termination reasoning", level: "proficient", evidence: "Explained base-case guarantees unprompted and applied them to cycle detection during the viva." },
        { name: "Linked structures", level: "distinction", evidence: "Implemented insertion/deletion correctly in the week 9 project and defended pointer invariants under follow-up questioning." },
        { name: "Complexity analysis", level: "proficient", evidence: "Correctly characterized best/worst cases for BST operations and identified when self-balancing is required." },
      ],
      evidenceSummary:
        "Six graded submissions across nine weeks showing sustained improvement, capped by a 14-minute oral viva with follow-up probing. Grading decisions were reviewed and approved by course faculty.",
      verificationCode,
      status: "issued",
      model: "gemini-2.5-flash",
      issuedAt: daysAgo(2, 16),
    });
    console.log(`🏅 Micro-credential: issued — /verify/${verificationCode}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log("🎉 Recovery-arc student seeded");
  console.log("═".repeat(64));
  console.log("  Emeka Nwosu — emeka.nwosu@miva.edu.ng — TestPass123!");
  console.log("  Arc: COS201 grades 42 → 51 → 58 → 71 → 84 → 91");
  console.log("  Streak: 12 days · 3 flashcards due · plan targets DP");
  console.log("  Ledger: 3 AI grading decisions (approved by Dr. Adebayo)");
  console.log("  Viva 78/100 → 'proficient' micro-credential (see /verify link above)");
  console.log("═".repeat(64));
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

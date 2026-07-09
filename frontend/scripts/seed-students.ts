/**
 * Sprint 5 Phase 2 — Seed 3 Demo Students
 *
 * Students:
 *   1. Ada Okonkwo   — 200L, 8 completed + 5 active (CGPA ~4.5, First Class)
 *   2. Chidi Okeke   — 300L, 19 completed + 4 active (CGPA ~4.16, 2:1)
 *   3. Bisi Adeyemi  — 100L, 0 completed + 4 active (no grades, edge case)
 *
 * Idempotent: existing users are updated, duplicate enrollments are skipped.
 * Run: npx tsx scripts/seed-students.ts
 */
import "load-env";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  AccountSchema,
  CourseSchema,
  ProgramSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "lib/db/pg/schema.pg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrollmentDef {
  courseCode: string;
  semester: "first" | "second";
  academicYear: string;
  status: "enrolled" | "completed";
  finalGrade?: string;
  gradePoints?: string; // decimal as string for Drizzle
}

interface StudentDef {
  name: string;
  email: string;
  studentId: string;
  currentLevel: number;
  currentSemester: string;
  academicYear: string;
  admissionSession: string;
  admissionLevel: number;
  enrollments: EnrollmentDef[];
  expectedCompleted: number;
  expectedActive: number;
}

// ─── Student Definitions ──────────────────────────────────────────────────────

const STUDENTS: StudentDef[] = [
  // ── Student 1: Ada Okonkwo (PRIMARY DEMO CHARACTER) ──
  {
    name: "Ada Okonkwo",
    email: "ada.okonkwo@miva.edu.ng",
    studentId: "MIVA/CS/2024/001",
    currentLevel: 200,
    currentSemester: "first",
    academicYear: "2025-2026",
    admissionSession: "2024-2025",
    admissionLevel: 100,
    expectedCompleted: 8,
    expectedActive: 5,
    enrollments: [
      // 100L First Semester (2024-2025) — all completed
      {
        courseCode: "COS101",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "MTH101",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "GST111",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "PHY101",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      // 100L Second Semester (2024-2025) — all completed
      {
        courseCode: "COS102",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "MTH102",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "GST122",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "PHY102",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      // 200L First Semester (2025-2026, CURRENT) — enrolled, no grades
      {
        courseCode: "COS201",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "COS203",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "COS205",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "MTH201",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "GST112",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
    ],
  },

  // ── Student 2: Chidi Okeke (FURTHER ALONG, RICHER HISTORY) ──
  {
    name: "Chidi Okeke",
    email: "chidi.okeke@miva.edu.ng",
    studentId: "MIVA/CS/2023/002",
    currentLevel: 300,
    currentSemester: "first",
    academicYear: "2025-2026",
    admissionSession: "2023-2024",
    admissionLevel: 100,
    // Task spec says 19 completed but only 18 courses are listed (4+4+5+5).
    // Using actual listed count of 18.
    expectedCompleted: 18,
    expectedActive: 4,
    enrollments: [
      // 100L First (2023-2024)
      {
        courseCode: "COS101",
        semester: "first",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "MTH101",
        semester: "first",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "GST111",
        semester: "first",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "PHY101",
        semester: "first",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "C",
        gradePoints: "3.00",
      },
      // 100L Second (2023-2024)
      {
        courseCode: "COS102",
        semester: "second",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "MTH102",
        semester: "second",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "GST122",
        semester: "second",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "PHY102",
        semester: "second",
        academicYear: "2023-2024",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      // 200L First (2024-2025)
      {
        courseCode: "COS201",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "COS203",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "COS205",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "C",
        gradePoints: "3.00",
      },
      {
        courseCode: "MTH201",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "GST112",
        semester: "first",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      // 200L Second (2024-2025)
      {
        courseCode: "COS202",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "COS204",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "COS206",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      {
        courseCode: "MTH202",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "A",
        gradePoints: "5.00",
      },
      {
        courseCode: "GST212",
        semester: "second",
        academicYear: "2024-2025",
        status: "completed",
        finalGrade: "B",
        gradePoints: "4.00",
      },
      // 300L First (2025-2026, CURRENT) — enrolled
      {
        courseCode: "COS301",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "COS303",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "COS305",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "COS307",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
    ],
  },

  // ── Student 3: Bisi Adeyemi (FRESH STUDENT, EDGE CASE) ──
  {
    name: "Bisi Adeyemi",
    email: "bisi.adeyemi@miva.edu.ng",
    studentId: "MIVA/CS/2025/003",
    currentLevel: 100,
    currentSemester: "first",
    academicYear: "2025-2026",
    admissionSession: "2025-2026",
    admissionLevel: 100,
    expectedCompleted: 0,
    expectedActive: 4,
    enrollments: [
      // 100L First (2025-2026, CURRENT) — enrolled, no grades
      {
        courseCode: "COS101",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "MTH101",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "GST111",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
      {
        courseCode: "PHY101",
        semester: "first",
        academicYear: "2025-2026",
        status: "enrolled",
      },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎓 Sprint 5 Phase 2 — Seeding Demo Students...\n");

  // ── Step 1: Look up B.Sc CS program ─────────────────────────────────────
  const [program] = await db
    .select()
    .from(ProgramSchema)
    .where(eq(ProgramSchema.code, "CS"))
    .limit(1);

  if (!program) {
    console.error(
      "❌ Program B.Sc Computer Science (code=CS) not found. Run seed-demo-data.ts first.",
    );
    process.exit(1);
  }
  console.log(`✅ Program: ${program.name} (${program.id})\n`);

  // ── Step 1b: Resolve tenant (MIVA) — students must be university-scoped ──
  const { UniversitySchema } = await import("lib/db/pg/schema.pg");
  const [university] = await db
    .select()
    .from(UniversitySchema)
    .where(eq(UniversitySchema.slug, "miva"))
    .limit(1);

  if (!university) {
    console.error(
      "❌ University with slug 'miva' not found. Seed universities first.",
    );
    process.exit(1);
  }
  console.log(`✅ University: ${university.name} (${university.id})\n`);

  // Demo students always carry a fresh 30-day trial so they never hit the
  // paywall in demos/tests (idempotent re-runs refresh it).
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ── Step 2: Build course lookup ─────────────────────────────────────────
  const allCourseCodes = [
    ...new Set(STUDENTS.flatMap((s) => s.enrollments.map((e) => e.courseCode))),
  ];
  const courses = await db
    .select()
    .from(CourseSchema)
    .where(inArray(CourseSchema.courseCode, allCourseCodes));

  const courseByCode = new Map(courses.map((c) => [c.courseCode, c]));

  // Verify all codes resolve
  const missing = allCourseCodes.filter((code) => !courseByCode.has(code));
  if (missing.length > 0) {
    console.error(
      `❌ Missing courses in DB: ${missing.join(", ")}. Run seed-demo-data.ts first.`,
    );
    process.exit(1);
  }
  console.log(`✅ All ${allCourseCodes.length} course codes resolved\n`);

  // ── Step 3: Hash password once (same for all 3) ─────────────────────────
  const hashedPassword = await hashPassword("TestPass123!");

  // ── Step 4: Seed each student in a transaction ──────────────────────────
  for (const student of STUDENTS) {
    console.log(`─── Seeding: ${student.name} (${student.studentId}) ───`);

    await db.transaction(async (tx) => {
      // 4a. Upsert user row
      const [existing] = await tx
        .select()
        .from(UserSchema)
        .where(eq(UserSchema.email, student.email))
        .limit(1);

      let userId: string;

      if (existing) {
        // Update existing user to match expected state
        await tx
          .update(UserSchema)
          .set({
            name: student.name,
            studentId: student.studentId,
            role: "student",
            currentLevel: student.currentLevel,
            currentSemester: student.currentSemester,
            academicYear: student.academicYear,
            enrollmentStatus: "active",
            programId: program.id,
            admissionSession: student.admissionSession,
            admissionLevel: student.admissionLevel,
            emailVerified: true,
            universityId: university.id,
            trialStartedAt,
            trialEndsAt,
          })
          .where(eq(UserSchema.id, existing.id));
        userId = existing.id;
        console.log(`  ⏭️  User exists — updated (${userId})`);
      } else {
        userId = crypto.randomUUID();
        await tx.insert(UserSchema).values({
          id: userId,
          name: student.name,
          email: student.email,
          password: hashedPassword,
          role: "student",
          studentId: student.studentId,
          currentLevel: student.currentLevel,
          currentSemester: student.currentSemester,
          academicYear: student.academicYear,
          enrollmentStatus: "active",
          programId: program.id,
          admissionSession: student.admissionSession,
          admissionLevel: student.admissionLevel,
          emailVerified: true,
          universityId: university.id,
          trialStartedAt,
          trialEndsAt,
        });

        // Create better-auth credential account
        await tx.insert(AccountSchema).values({
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ User created (${userId})`);
      }

      // 4b. Upsert enrollment rows
      let created = 0;
      let skipped = 0;

      for (const enr of student.enrollments) {
        const course = courseByCode.get(enr.courseCode)!;

        // Check if enrollment already exists (unique: studentId + courseId + semester)
        const [existingEnr] = await tx
          .select({ id: StudentEnrollmentSchema.id })
          .from(StudentEnrollmentSchema)
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, userId),
              eq(StudentEnrollmentSchema.courseId, course.id),
              eq(StudentEnrollmentSchema.semester, enr.semester),
              eq(StudentEnrollmentSchema.academicYear, enr.academicYear),
            ),
          )
          .limit(1);

        if (existingEnr) {
          skipped++;
          continue;
        }

        await tx.insert(StudentEnrollmentSchema).values({
          studentId: userId,
          courseId: course.id,
          semester: enr.semester,
          academicYear: enr.academicYear,
          status: enr.status,
          finalGrade: enr.finalGrade ?? null,
          gradePoints: enr.gradePoints ?? null,
        });
        created++;
      }

      console.log(`  📚 Enrollments: ${created} created, ${skipped} skipped`);

      // 4c. Verify counts
      const completedRows = await tx
        .select({ id: StudentEnrollmentSchema.id })
        .from(StudentEnrollmentSchema)
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.status, "completed"),
          ),
        );
      const activeRows = await tx
        .select({ id: StudentEnrollmentSchema.id })
        .from(StudentEnrollmentSchema)
        .where(
          and(
            eq(StudentEnrollmentSchema.studentId, userId),
            eq(StudentEnrollmentSchema.status, "enrolled"),
          ),
        );

      const completedOk = completedRows.length === student.expectedCompleted;
      const activeOk = activeRows.length === student.expectedActive;
      const total = completedRows.length + activeRows.length;

      console.log(
        `  ${completedOk ? "✅" : "⚠️"} Completed: ${completedRows.length} (expected ${student.expectedCompleted})`,
      );
      console.log(
        `  ${activeOk ? "✅" : "⚠️"} Active: ${activeRows.length} (expected ${student.expectedActive})`,
      );
      console.log(`  📊 Total: ${total}\n`);
    });
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("🎉 Sprint 5 Phase 2 — Demo Students Seeded!");
  console.log("═".repeat(60));
  console.log("  Students:");
  for (const s of STUDENTS) {
    console.log(
      `    ${s.name} — ${s.email} — ${s.studentId} — Level ${s.currentLevel}`,
    );
  }
  console.log(`  Password: TestPass123! (bcrypt-hashed, same for all 3)`);
  console.log("═".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

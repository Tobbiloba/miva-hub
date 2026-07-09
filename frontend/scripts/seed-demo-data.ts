/**
 * Sprint 5 Demo Data Seed
 *
 * Seeds: academic session, program, faculty (4), missing courses (~17),
 * program curriculum mapping, class schedules, and faculty-course assignments.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING where possible, checks existence before insert.
 * Run: npx tsx scripts/seed-demo-data.ts
 */
import "load-env";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  AccountSchema,
  ClassScheduleSchema,
  CourseInstructorSchema,
  CourseSchema,
  DepartmentSchema,
  FacultySchema,
  ProgramCurriculumSchema,
  ProgramSchema,
  UserSchema,
} from "lib/db/pg/schema.pg";

const CS_DEPT_CODE = "CS"; // Computer Science department code in DB

async function main() {
  console.log("🌱 Sprint 5 Demo Data Seeding...\n");

  // ─── Step 1: Get CS Department ───────────────────────────────────────────
  const [csDept] = await db
    .select()
    .from(DepartmentSchema)
    .where(eq(DepartmentSchema.code, CS_DEPT_CODE))
    .limit(1);
  if (!csDept) {
    console.error(
      "❌ Computer Science department not found (code: CS). Run seed-academic-data first.",
    );
    process.exit(1);
  }
  console.log(`✅ Step 1: Department found — ${csDept.name} (${csDept.id})`);

  // ─── Step 2: Program ─────────────────────────────────────────────────────
  let program = (
    await db
      .select()
      .from(ProgramSchema)
      .where(eq(ProgramSchema.code, "CS"))
      .limit(1)
  )[0];
  if (!program) {
    [program] = (await db
      .insert(ProgramSchema)
      .values({
        code: "CS",
        name: "B.Sc Computer Science",
        description:
          "Bachelor of Science in Computer Science. 4-year program covering theoretical foundations, software development, data structures, algorithms, and applied computing.",
        departmentId: csDept.id,
        universityId: csDept.universityId,
        isActive: true,
      })
      .returning()) as (typeof ProgramSchema.$inferSelect)[];
    console.log(`✅ Step 2: Program created — ${program.name} (${program.id})`);
  } else {
    console.log(
      `✅ Step 2: Program already exists — ${program.name} (${program.id})`,
    );
  }

  // ─── Step 3: Faculty (4 people) ──────────────────────────────────────────
  const facultyDefs = [
    {
      name: "Dr. Adebayo Olumide",
      email: "adebayo.olumide@miva.edu.ng",
      position: "associate_professor" as const,
      bio: "PhD in Computer Science from University of Lagos. Research interests in distributed systems and AI.",
      office: "Room CS-A-201",
      officeHours: "Mon/Wed 2:00-4:00 PM, Tue 10:00-12:00 PM",
    },
    {
      name: "Dr. Kemi Adesanya",
      email: "kemi.adesanya@miva.edu.ng",
      position: "assistant_professor" as const,
      bio: "PhD in Software Engineering. Specializes in object-oriented design and software architecture.",
      office: "Room CS-A-203",
      officeHours: "Mon/Fri 1:00-3:00 PM",
    },
    {
      name: "Mr. Tunde Ogundimu",
      email: "tunde.ogundimu@miva.edu.ng",
      position: "lecturer" as const,
      bio: "M.Sc Computer Science. Database systems and web development.",
      office: "Room CS-B-105",
      officeHours: "Tue/Thu 11:00 AM - 1:00 PM",
    },
    {
      name: "Mrs. Funke Okon",
      email: "funke.okon@miva.edu.ng",
      position: "instructor" as const,
      bio: "M.Sc Information Technology. Mathematics and discrete structures.",
      office: "Room CS-B-107",
      officeHours: "Wed/Fri 10:00 AM - 12:00 PM",
    },
  ];

  const facultyCredentials: {
    name: string;
    email: string;
    tempPassword: string;
    facultyId: string;
  }[] = [];

  for (const fd of facultyDefs) {
    // Check if user with this email already exists
    const existing = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, fd.email))
      .limit(1);
    if (existing.length > 0) {
      // Get faculty record
      const [fac] = await db
        .select()
        .from(FacultySchema)
        .where(eq(FacultySchema.userId, existing[0].id))
        .limit(1);
      console.log(`  ⏭️  Faculty exists: ${fd.name} (${fd.email})`);
      if (fac) {
        facultyCredentials.push({
          name: fd.name,
          email: fd.email,
          tempPassword: "(already created)",
          facultyId: fac.id,
        });
      }
      continue;
    }

    const tempPassword = `Faculty${Math.random().toString(36).slice(-8)}!`;
    const hashedPassword = await hashPassword(tempPassword);
    const userId = crypto.randomUUID();
    const facultyId = crypto.randomUUID();
    const employeeId = `FAC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(-4).toUpperCase()}`;

    await db.insert(UserSchema).values({
      id: userId,
      name: fd.name,
      email: fd.email,
      password: hashedPassword,
      role: "faculty",
      emailVerified: true,
    });

    // Create better-auth credential account
    await db.insert(AccountSchema).values({
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(FacultySchema).values({
      id: facultyId,
      userId,
      employeeId,
      departmentId: csDept.id,
      position: fd.position,
      officeLocation: fd.office,
      officeHours: fd.officeHours,
      bio: fd.bio,
      isActive: true,
    });

    facultyCredentials.push({
      name: fd.name,
      email: fd.email,
      tempPassword,
      facultyId,
    });
    console.log(`  ✅ Created: ${fd.name} (${fd.email})`);
  }

  console.log(
    `✅ Step 3: Faculty complete (${facultyCredentials.length} total)`,
  );
  console.log("\n🔑 FACULTY CREDENTIALS (save these!):");
  console.log("─".repeat(60));
  for (const fc of facultyCredentials) {
    console.log(`  ${fc.name}`);
    console.log(`    Email:    ${fc.email}`);
    console.log(`    Password: ${fc.tempPassword}`);
    console.log(`    ID:       ${fc.facultyId}`);
    console.log();
  }
  console.log("─".repeat(60));

  // ─── Step 4: Academic Session ────────────────────────────────────────────
  let session = (
    await db
      .select()
      .from(AcademicSessionSchema)
      .where(eq(AcademicSessionSchema.sessionName, "2025/2026"))
      .limit(1)
  )[0];
  if (!session) {
    // Deactivate any existing current session
    await db
      .update(AcademicSessionSchema)
      .set({ isCurrent: false })
      .where(eq(AcademicSessionSchema.isCurrent, true));

    [session] = await db
      .insert(AcademicSessionSchema)
      .values({
        universityId: csDept.universityId,
        sessionName: "2025/2026",
        currentSemester: "first",
        isCurrent: true,
        status: "active",
        firstSemStart: "2025-09-01",
        firstSemEnd: "2026-01-31",
        secondSemStart: "2026-02-15",
        secondSemEnd: "2026-07-15",
      })
      .returning();
    console.log(
      `\n✅ Step 4: Academic session created — ${session.sessionName} (current, active)`,
    );
  } else {
    // Ensure it's current
    if (!session.isCurrent) {
      await db
        .update(AcademicSessionSchema)
        .set({ isCurrent: false })
        .where(eq(AcademicSessionSchema.isCurrent, true));
      await db
        .update(AcademicSessionSchema)
        .set({ isCurrent: true, status: "active" })
        .where(eq(AcademicSessionSchema.id, session.id));
    }
    console.log(
      `\n✅ Step 4: Academic session already exists — ${session.sessionName}`,
    );
  }

  // ─── Step 5: Courses (create missing ones) ──────────────────────────────
  // First, map existing courses by code
  const existingCourses = await db
    .select()
    .from(CourseSchema)
    .where(eq(CourseSchema.departmentId, csDept.id));
  const existingByCode = new Map(existingCourses.map((c) => [c.courseCode, c]));

  // Also check for GST/MTH/PHY courses (may be under different dept)
  const otherCodes = [
    "GST101",
    "GST102",
    "GST201",
    "GST202",
    "GST111",
    "GST112",
    "GST121",
    "GST122",
    "GST212",
    "GST312",
    "MTH101",
    "MTH102",
    "MTH201",
    "MTH202",
    "PHY101",
    "PHY102",
  ];
  const otherCourses = await db
    .select()
    .from(CourseSchema)
    .where(inArray(CourseSchema.courseCode, otherCodes));
  for (const c of otherCourses) {
    existingByCode.set(c.courseCode, c);
  }

  // Courses to create (only if missing)
  const coursesToCreate = [
    // Use existing GST codes from real MIVA curriculum
    // GST111 = Communication in English I (already exists as GST111)
    // GST122 = Communication in English II (already exists as GST122)
    // GST112 = Nigerian People and Culture (already exists as GST112)
    // GST212 = Philosophy, Logic and Human Existence (already exists as GST212)

    // Missing COS courses
    {
      courseCode: "COS204",
      title: "Data Structures",
      credits: 3,
      level: "200L" as const,
      semesterOffered: "spring" as const,
    },
    {
      courseCode: "COS205",
      title: "Digital Logic Design",
      credits: 3,
      level: "200L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS206",
      title: "Computer Architecture",
      credits: 3,
      level: "200L" as const,
      semesterOffered: "spring" as const,
    },
    {
      courseCode: "COS301",
      title: "Algorithm Design and Analysis",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS302",
      title: "Operating Systems",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "spring" as const,
    },
    {
      courseCode: "COS303",
      title: "Database Management Systems",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS304",
      title: "Computer Networks",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "spring" as const,
    },
    {
      courseCode: "COS305",
      title: "Software Engineering",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS307",
      title: "Web Programming",
      credits: 3,
      level: "300L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS401",
      title: "Final Year Project I",
      credits: 3,
      level: "400L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS402",
      title: "Final Year Project II",
      credits: 6,
      level: "400L" as const,
      semesterOffered: "spring" as const,
    },
    {
      courseCode: "COS403",
      title: "Distributed Systems",
      credits: 3,
      level: "400L" as const,
      semesterOffered: "fall" as const,
    },
    {
      courseCode: "COS405",
      title: "Artificial Intelligence",
      credits: 3,
      level: "400L" as const,
      semesterOffered: "fall" as const,
    },
  ];

  // GST courses: use real MIVA codes (GST111/112/122/212) — already exist in DB.
  // Do NOT create GST101/102/201/202 (duplicates cleaned up in cleanup-gst-dupes.ts).

  let createdCount = 0;
  let skippedCount = 0;

  for (const course of coursesToCreate) {
    if (existingByCode.has(course.courseCode)) {
      skippedCount++;
      continue;
    }
    const [created] = await db
      .insert(CourseSchema)
      .values({
        ...course,
        departmentId: csDept.id,
        universityId: csDept.universityId,
        isActive: true,
        totalWeeks: 16,
      })
      .returning();
    existingByCode.set(created.courseCode, created);
    createdCount++;
  }

  console.log(
    `\n✅ Step 5: Courses — ${createdCount} created, ${skippedCount} already existed`,
  );

  // ─── Step 6: Program Curriculum Mapping ──────────────────────────────────
  // Use real MIVA GST codes
  const gst1a = existingByCode.get("GST111"); // Communication in English I
  const gst1b = existingByCode.get("GST122"); // Communication in English II
  const gst2a = existingByCode.get("GST112"); // Nigerian People and Culture
  const gst2b = existingByCode.get("GST212"); // Philosophy, Logic and Human Existence

  const curriculumEntries: {
    courseId: string;
    level: number;
    semester: "first" | "second";
    isCompulsory: boolean;
    orderInSemester: number;
  }[] = [
    // 100L First Semester
    {
      courseId: existingByCode.get("COS101")!.id,
      level: 100,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("MTH101")!.id,
      level: 100,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 2,
    },
    ...(gst1a
      ? [
          {
            courseId: gst1a.id,
            level: 100,
            semester: "first" as const,
            isCompulsory: true,
            orderInSemester: 3,
          },
        ]
      : []),
    {
      courseId: existingByCode.get("PHY101")!.id,
      level: 100,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 4,
    },
    // 100L Second Semester
    {
      courseId: existingByCode.get("COS102")!.id,
      level: 100,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("MTH102")!.id,
      level: 100,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 2,
    },
    ...(gst1b
      ? [
          {
            courseId: gst1b.id,
            level: 100,
            semester: "second" as const,
            isCompulsory: true,
            orderInSemester: 3,
          },
        ]
      : []),
    {
      courseId: existingByCode.get("PHY102")!.id,
      level: 100,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 4,
    },
    // 200L First Semester
    {
      courseId: existingByCode.get("COS201")!.id,
      level: 200,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("COS203")!.id,
      level: 200,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 2,
    },
    {
      courseId: existingByCode.get("COS205")!.id,
      level: 200,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 3,
    },
    {
      courseId: existingByCode.get("MTH201")!.id,
      level: 200,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 4,
    },
    ...(gst2a
      ? [
          {
            courseId: gst2a.id,
            level: 200,
            semester: "first" as const,
            isCompulsory: true,
            orderInSemester: 5,
          },
        ]
      : []),
    // 200L Second Semester
    {
      courseId: existingByCode.get("COS202")!.id,
      level: 200,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("COS204")!.id,
      level: 200,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 2,
    },
    {
      courseId: existingByCode.get("COS206")!.id,
      level: 200,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 3,
    },
    {
      courseId: existingByCode.get("MTH202")!.id,
      level: 200,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 4,
    },
    ...(gst2b
      ? [
          {
            courseId: gst2b.id,
            level: 200,
            semester: "second" as const,
            isCompulsory: true,
            orderInSemester: 5,
          },
        ]
      : []),
    // 300L First Semester
    {
      courseId: existingByCode.get("COS301")!.id,
      level: 300,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("COS303")!.id,
      level: 300,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 2,
    },
    {
      courseId: existingByCode.get("COS305")!.id,
      level: 300,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 3,
    },
    {
      courseId: existingByCode.get("COS307")!.id,
      level: 300,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 4,
    },
    // 300L Second Semester
    {
      courseId: existingByCode.get("COS302")!.id,
      level: 300,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("COS304")!.id,
      level: 300,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 2,
    },
    // 400L First Semester
    {
      courseId: existingByCode.get("COS401")!.id,
      level: 400,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 1,
    },
    {
      courseId: existingByCode.get("COS403")!.id,
      level: 400,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 2,
    },
    {
      courseId: existingByCode.get("COS405")!.id,
      level: 400,
      semester: "first",
      isCompulsory: true,
      orderInSemester: 3,
    },
    // 400L Second Semester
    {
      courseId: existingByCode.get("COS402")!.id,
      level: 400,
      semester: "second",
      isCompulsory: true,
      orderInSemester: 1,
    },
  ];

  let currCreated = 0;
  let currSkipped = 0;
  for (const entry of curriculumEntries) {
    // Check for existing mapping
    const exists = await db
      .select({ id: ProgramCurriculumSchema.id })
      .from(ProgramCurriculumSchema)
      .where(
        and(
          eq(ProgramCurriculumSchema.programId, program.id),
          eq(ProgramCurriculumSchema.courseId, entry.courseId),
          eq(ProgramCurriculumSchema.level, entry.level),
          eq(ProgramCurriculumSchema.semester, entry.semester),
        ),
      )
      .limit(1);

    if (exists.length > 0) {
      currSkipped++;
      continue;
    }

    await db.insert(ProgramCurriculumSchema).values({
      programId: program.id,
      ...entry,
    });
    currCreated++;
  }
  console.log(
    `\n✅ Step 6: Curriculum mapping — ${currCreated} created, ${currSkipped} already existed`,
  );

  // ─── Step 7: Class Schedules (200L First Semester) ───────────────────────
  const semesterLabel = "2025/2026-first";
  const scheduleDefs: {
    courseCode: string;
    entries: {
      day: string;
      start: string;
      end: string;
      room: string;
      type?: string;
    }[];
  }[] = [
    {
      courseCode: "COS201",
      entries: [
        {
          day: "monday",
          start: "10:00",
          end: "11:30",
          room: "Online Live Session",
        },
        {
          day: "wednesday",
          start: "10:00",
          end: "11:30",
          room: "Online Live Session",
        },
      ],
    },
    {
      courseCode: "COS203",
      entries: [
        {
          day: "monday",
          start: "14:00",
          end: "15:30",
          room: "Online Live Session",
        },
        {
          day: "friday",
          start: "14:00",
          end: "15:30",
          room: "Online Live Session",
        },
      ],
    },
    {
      courseCode: "COS205",
      entries: [
        {
          day: "tuesday",
          start: "10:00",
          end: "11:30",
          room: "Lab Room CS-Lab-1",
          type: "lab",
        },
        {
          day: "thursday",
          start: "10:00",
          end: "11:30",
          room: "Lab Room CS-Lab-1",
          type: "lab",
        },
      ],
    },
    {
      courseCode: "MTH201",
      entries: [
        {
          day: "tuesday",
          start: "14:00",
          end: "15:30",
          room: "Online Live Session",
        },
        {
          day: "thursday",
          start: "14:00",
          end: "15:30",
          room: "Online Live Session",
        },
      ],
    },
    {
      courseCode: "GST112", // Nigerian People and Culture (real MIVA code)
      entries: [
        {
          day: "wednesday",
          start: "16:00",
          end: "18:00",
          room: "Online Live Session",
        },
      ],
    },
  ];

  let schedCreated = 0;
  let schedSkipped = 0;
  for (const sched of scheduleDefs) {
    const course = existingByCode.get(sched.courseCode);
    if (!course) {
      console.log(
        `  ⚠️  Schedule: course ${sched.courseCode} not found, skipping`,
      );
      continue;
    }

    for (const entry of sched.entries) {
      // Check existing
      const exists = await db
        .select({ id: ClassScheduleSchema.id })
        .from(ClassScheduleSchema)
        .where(
          and(
            eq(ClassScheduleSchema.courseId, course.id),
            eq(ClassScheduleSchema.semester, semesterLabel),
            eq(ClassScheduleSchema.dayOfWeek, entry.day as any),
            eq(ClassScheduleSchema.startTime, entry.start),
          ),
        )
        .limit(1);

      if (exists.length > 0) {
        schedSkipped++;
        continue;
      }

      await db.insert(ClassScheduleSchema).values({
        courseId: course.id,
        semester: semesterLabel,
        dayOfWeek: entry.day as any,
        startTime: entry.start,
        endTime: entry.end,
        roomLocation: entry.room,
        classType: (entry.type as any) || "lecture",
      });
      schedCreated++;
    }
  }
  console.log(
    `\n✅ Step 7: Schedules — ${schedCreated} created, ${schedSkipped} already existed`,
  );

  // ─── Step 8: Faculty-to-Course Assignments ───────────────────────────────
  // Build faculty lookup by email
  const facultyByEmail = new Map<string, string>();
  for (const fc of facultyCredentials) {
    facultyByEmail.set(fc.email, fc.facultyId);
  }

  const instructorDefs = [
    {
      courseCode: "COS201",
      email: "adebayo.olumide@miva.edu.ng",
      role: "primary" as const,
    },
    {
      courseCode: "COS201",
      email: "tunde.ogundimu@miva.edu.ng",
      role: "assistant" as const,
    },
    {
      courseCode: "COS203",
      email: "kemi.adesanya@miva.edu.ng",
      role: "primary" as const,
    },
    {
      courseCode: "COS205",
      email: "adebayo.olumide@miva.edu.ng",
      role: "primary" as const,
    },
    {
      courseCode: "MTH201",
      email: "funke.okon@miva.edu.ng",
      role: "primary" as const,
    },
    {
      courseCode: "GST112",
      email: "funke.okon@miva.edu.ng",
      role: "primary" as const,
    },
  ];

  let instrCreated = 0;
  let instrSkipped = 0;
  for (const idef of instructorDefs) {
    const course = existingByCode.get(idef.courseCode);
    const facultyId = facultyByEmail.get(idef.email);
    if (!course || !facultyId) {
      console.log(
        `  ⚠️  Instructor: ${idef.courseCode} or ${idef.email} not found, skipping`,
      );
      continue;
    }

    const exists = await db
      .select({ id: CourseInstructorSchema.id })
      .from(CourseInstructorSchema)
      .where(
        and(
          eq(CourseInstructorSchema.courseId, course.id),
          eq(CourseInstructorSchema.facultyId, facultyId),
          eq(CourseInstructorSchema.semester, semesterLabel),
        ),
      )
      .limit(1);

    if (exists.length > 0) {
      instrSkipped++;
      continue;
    }

    await db.insert(CourseInstructorSchema).values({
      courseId: course.id,
      facultyId,
      semester: semesterLabel,
      role: idef.role,
    });
    instrCreated++;
  }
  console.log(
    `\n✅ Step 8: Instructor assignments — ${instrCreated} created, ${instrSkipped} already existed`,
  );

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("🎉 Sprint 5 Demo Data Seeding Complete!");
  console.log("═".repeat(60));
  console.log(`  Department:    ${csDept.name} (${csDept.code})`);
  console.log(`  Program:       ${program.name} (${program.code})`);
  console.log(`  Session:       ${session.sessionName} (active, current)`);
  console.log(`  Faculty:       ${facultyCredentials.length} members`);
  console.log(
    `  Courses:       ${createdCount} new + ${skippedCount} existing`,
  );
  console.log(`  Curriculum:    ${currCreated} mappings`);
  console.log(`  Schedules:     ${schedCreated} entries`);
  console.log(`  Instructors:   ${instrCreated} assignments`);
  console.log("═".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

/**
 * One-shot cleanup: remove duplicate GST courses (GST101/102/201/202),
 * remap curriculum/instructor/schedule to real MIVA codes (GST111/112/122/212).
 * Runs in a single transaction. Safe to re-run (idempotent checks).
 */
import "load-env";
import { sql } from "drizzle-orm";
import { pgDb as db } from "lib/db/pg/db.pg";

async function cleanup() {
  // Get real GST course IDs
  const realGst = await db.execute(
    sql`SELECT id, course_code FROM course WHERE course_code IN ('GST111', 'GST112', 'GST122', 'GST212')`,
  );
  const realMap = new Map<string, string>();
  for (const r of realGst.rows)
    realMap.set(r.course_code as string, r.id as string);
  console.log("Real GST courses:");
  for (const [code, id] of realMap) console.log("  " + code + " = " + id);

  // Get duplicate GST course IDs
  const dupeGst = await db.execute(
    sql`SELECT id, course_code FROM course WHERE course_code IN ('GST101', 'GST102', 'GST201', 'GST202')`,
  );
  const dupeMap = new Map<string, string>();
  for (const r of dupeGst.rows)
    dupeMap.set(r.course_code as string, r.id as string);

  if (dupeMap.size === 0) {
    console.log("\n✅ No duplicate GST courses found — already cleaned up.");
    process.exit(0);
  }

  console.log("\nDuplicate GST courses to delete:");
  for (const [code, id] of dupeMap) console.log("  " + code + " = " + id);

  // Verify all real IDs found
  for (const code of ["GST111", "GST112", "GST122", "GST212"]) {
    if (!realMap.has(code)) {
      console.error("Missing real GST course: " + code);
      process.exit(1);
    }
  }

  // Get program ID
  const progResult = await db.execute(
    sql`SELECT id FROM program WHERE code = 'CS' LIMIT 1`,
  );
  const programId = (progResult.rows[0] as any)?.id;
  console.log("\nProgram ID: " + programId);

  // Execute in transaction
  await db.execute(sql`BEGIN`);
  try {
    // 1. Reassign instructor from GST201 → GST112
    if (dupeMap.has("GST201")) {
      const instrUpdate = await db.execute(
        sql`UPDATE course_instructor SET course_id = ${realMap.get("GST112")!} WHERE course_id = ${dupeMap.get("GST201")!}`,
      );
      console.log(
        "\n1. Instructor reassigned: GST201 → GST112 (" +
          instrUpdate.rowCount +
          " rows)",
      );

      // 2. Reassign class schedules from GST201 → GST112
      const schedUpdate = await db.execute(
        sql`UPDATE class_schedule SET course_id = ${realMap.get("GST112")!} WHERE course_id = ${dupeMap.get("GST201")!}`,
      );
      console.log(
        "2. Schedules reassigned: GST201 → GST112 (" +
          schedUpdate.rowCount +
          " rows)",
      );
    }

    // 3. Delete curriculum mappings for ALL duplicate GSTs
    const currDel = await db.execute(
      sql`DELETE FROM program_curriculum WHERE course_id IN (${sql.join(
        [...dupeMap.values()].map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );
    console.log(
      "3. Curriculum mappings deleted: " + currDel.rowCount + " rows",
    );

    // 4. Insert new curriculum mappings for real GST codes (skip if already exists)
    const mappings = [
      {
        courseId: realMap.get("GST111")!,
        level: 100,
        semester: "first",
        order: 3,
      },
      {
        courseId: realMap.get("GST122")!,
        level: 100,
        semester: "second",
        order: 3,
      },
      {
        courseId: realMap.get("GST112")!,
        level: 200,
        semester: "first",
        order: 5,
      },
      {
        courseId: realMap.get("GST212")!,
        level: 200,
        semester: "second",
        order: 5,
      },
    ];

    let currCreated = 0;
    for (const m of mappings) {
      const exists = await db.execute(
        sql`SELECT 1 FROM program_curriculum WHERE program_id = ${programId} AND course_id = ${m.courseId} AND level = ${m.level} AND semester = ${m.semester}::semester_enum LIMIT 1`,
      );
      if (exists.rows.length === 0) {
        await db.execute(
          sql`INSERT INTO program_curriculum (id, program_id, course_id, level, semester, is_compulsory, order_in_semester) VALUES (gen_random_uuid(), ${programId}, ${m.courseId}, ${m.level}, ${m.semester}::semester_enum, true, ${m.order})`,
        );
        currCreated++;
      }
    }
    console.log("4. New curriculum mappings created: " + currCreated);

    // 5. Delete the duplicate courses
    const courseDel = await db.execute(
      sql`DELETE FROM course WHERE course_code IN ('GST101', 'GST102', 'GST201', 'GST202')`,
    );
    console.log(
      "5. Duplicate courses deleted: " + courseDel.rowCount + " rows",
    );

    await db.execute(sql`COMMIT`);
    console.log("\n✅ Transaction committed successfully");
  } catch (err) {
    await db.execute(sql`ROLLBACK`);
    console.error("\n❌ Transaction rolled back:", err);
    process.exit(1);
  }

  // ─── Verification ───────────────────────────────────────────────────────
  const verify = await db.execute(
    sql`SELECT pc.level, pc.semester, c.course_code, c.title FROM program_curriculum pc JOIN course c ON c.id = pc.course_id WHERE c.course_code LIKE 'GST%' ORDER BY pc.level, pc.semester`,
  );
  console.log("\nVerification — GST in curriculum:");
  for (const r of verify.rows) {
    const row = r as any;
    console.log(
      "  Level " +
        row.level +
        " | " +
        row.semester +
        " | " +
        row.course_code +
        " | " +
        row.title,
    );
  }

  const instrVerify = await db.execute(
    sql`SELECT c.course_code, u.name, ci.role FROM course_instructor ci JOIN course c ON c.id = ci.course_id JOIN faculty f ON f.id = ci.faculty_id JOIN "user" u ON u.id = f.user_id WHERE c.course_code LIKE 'GST%'`,
  );
  console.log("\nVerification — GST instructors:");
  for (const r of instrVerify.rows) {
    const row = r as any;
    console.log("  " + row.course_code + " | " + row.name + " | " + row.role);
  }

  const schedVerify = await db.execute(
    sql`SELECT c.course_code, cs.day_of_week, cs.start_time, cs.end_time FROM class_schedule cs JOIN course c ON c.id = cs.course_id WHERE c.course_code LIKE 'GST%'`,
  );
  console.log("\nVerification — GST schedules:");
  for (const r of schedVerify.rows) {
    const row = r as any;
    console.log(
      "  " +
        row.course_code +
        " | " +
        row.day_of_week +
        " " +
        row.start_time +
        "-" +
        row.end_time,
    );
  }

  const remainCheck = await db.execute(
    sql`SELECT course_code FROM course WHERE course_code IN ('GST101', 'GST102', 'GST201', 'GST202')`,
  );
  console.log(
    "\nRemaining duplicate GST courses: " +
      remainCheck.rows.length +
      " (should be 0)",
  );

  process.exit(0);
}

cleanup().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

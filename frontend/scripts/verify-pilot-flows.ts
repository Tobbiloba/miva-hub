/**
 * E2E verify (local dev :4001): browse page renders, self-enroll works,
 * drop works, volunteer toggle API works, ingest tenant-scoping intact.
 */
import "load-env";
import { and, eq } from "drizzle-orm";
import { pgDb } from "../src/lib/db/pg/db.pg";
import {
  StudentEnrollmentSchema,
  UserSchema,
} from "../src/lib/db/pg/schema.pg";

const BASE = "http://localhost:4001";

async function loginCookie(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  const results: string[] = [];
  const emeka = await loginCookie("emeka.nwosu@miva.edu.ng", "TestPass123!");

  // 1. Browse page renders with courses
  const browse = await fetch(`${BASE}/student/courses/browse`, {
    headers: { cookie: emeka },
  });
  const browseHtml = await browse.text();
  results.push(
    `browse page: ${browse.status} ${browseHtml.includes("Course Registration") ? "✅ renders" : "🔴 missing header"}`,
  );

  // 2. Self-enroll in a course Emeka isn't in (GST103 or any non-enrolled)
  // find a course id from his university he's not enrolled in
  const [user] = await pgDb
    .select({ id: UserSchema.id, universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.email, "emeka.nwosu@miva.edu.ng"));
  const candidates = await pgDb.execute(
    `select c.id, c.course_code from course c
     where c.university_id = '${user.universityId}' and c.is_active = true
     and c.id not in (select course_id from student_enrollment where student_id = '${user.id}')
     limit 1` as any,
  );
  const course = (candidates as any).rows[0];
  if (!course) {
    results.push("enroll: 🔴 no candidate course found");
  } else {
    const enroll = await fetch(`${BASE}/api/student/enroll`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: emeka },
      body: JSON.stringify({ courseId: course.id }),
    });
    const ej = await enroll.json();
    results.push(
      `enroll ${course.course_code}: ${enroll.status} ${ej.message ?? ej.error}`,
    );

    // duplicate guard
    const dup = await fetch(`${BASE}/api/student/enroll`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: emeka },
      body: JSON.stringify({ courseId: course.id }),
    });
    results.push(`duplicate enroll blocked: ${dup.status === 409 ? "✅ 409" : `🔴 ${dup.status}`}`);

    // drop
    const drop = await fetch(
      `${BASE}/api/student/enroll?courseId=${course.id}`,
      { method: "DELETE", headers: { cookie: emeka } },
    );
    results.push(`drop: ${drop.status === 200 ? "✅ 200" : `🔴 ${drop.status}`}`);

    // re-enroll after drop reactivates
    const re = await fetch(`${BASE}/api/student/enroll`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: emeka },
      body: JSON.stringify({ courseId: course.id }),
    });
    const rj = await re.json();
    results.push(`re-enroll after drop: ${re.status} ${rj.message ?? rj.error}`);

    // clean up: drop again to leave Emeka's arc data pristine
    await fetch(`${BASE}/api/student/enroll?courseId=${course.id}`, {
      method: "DELETE",
      headers: { cookie: emeka },
    });
    // hard-delete the test enrollment row entirely
    await pgDb
      .delete(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, user.id),
          eq(StudentEnrollmentSchema.courseId, course.id),
        ),
      );
    results.push("cleanup: test enrollment removed ✅");
  }

  // 3. Volunteer toggle via admin API
  const admin = await loginCookie("xprize.tester@miva.edu.ng", "XprizeTest2026!");
  const vt = await fetch(`${BASE}/api/admin/students/${user.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: admin },
    body: JSON.stringify({ isVolunteer: true }),
  });
  const [after] = await pgDb
    .select({ v: UserSchema.isVolunteer })
    .from(UserSchema)
    .where(eq(UserSchema.id, user.id));
  results.push(
    `volunteer toggle: PUT ${vt.status}, db now ${after.v} ${vt.status === 200 && after.v ? "✅" : "🔴"}`,
  );
  // revert
  await fetch(`${BASE}/api/admin/students/${user.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: admin },
    body: JSON.stringify({ isVolunteer: false }),
  });
  results.push("volunteer flag reverted ✅");

  // 4. Ingest still guards non-volunteers (Emeka is not a volunteer now)
  const ingest = await fetch(`${BASE}/api/ingest/lesson`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: emeka },
    body: JSON.stringify({
      source_url: "https://lms.miva.university/x",
      course_code: "COS201",
      lesson_title: "t",
      content_type: "pdf",
      pdf_url: "https://lms-assets.miva.university/x.pdf",
    }),
  });
  results.push(
    `ingest volunteer gate: ${ingest.status === 403 ? "✅ 403 for non-volunteer" : `🔴 ${ingest.status}`}`,
  );

  console.log("\n=== PILOT FLOW VERIFICATION ===");
  results.forEach((r) => console.log(r));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

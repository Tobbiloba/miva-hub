import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  DepartmentSchema,
  ProgramSchema,
  UniversitySchema,
} from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

console.log("🎓 Starting Programs/Majors Seeding...");

async function seedPrograms() {
  try {
    const [university] = await db
      .select()
      .from(UniversitySchema)
      .where(eq(UniversitySchema.slug, "miva"));

    if (!university) {
      console.error(
        "❌ MIVA university not found. Seed the university (slug 'miva') before programs.",
      );
      return false;
    }

    // Programs — each maps to the department with the same code
    // (seed-majors-and-courses.ts creates each major as its own department)
    const programsData = [
      // Computing
      { code: "CS",  name: "Computer Science",                  description: "Study of computation, algorithms, and software development" },
      { code: "CYB", name: "Cybersecurity",                     description: "Focus on information security and cyber defense" },
      { code: "DTS", name: "Data Science",                      description: "Big data analytics, machine learning, and data visualization" },
      { code: "SEN", name: "Software Engineering",              description: "Software design, development, and project management" },
      { code: "ITE", name: "Information Technology",             description: "IT systems, networks, and technology management" },
      // Management & Social Sciences
      { code: "BUA", name: "Business Management",               description: "Business administration, operations, and strategy" },
      { code: "ECO", name: "Economics",                          description: "Economic theory, analysis, and policy" },
      { code: "ACC", name: "Accounting",                         description: "Financial accounting, auditing, and taxation" },
      { code: "PAD", name: "Public Policy and Administration",   description: "Public administration, governance, and policy analysis" },
      { code: "CSS", name: "Criminology and Security Studies",   description: "Criminal justice, law enforcement, and security" },
      // Communication & Media
      { code: "MCM", name: "Mass Communication and Media Studies", description: "Journalism, broadcasting, advertising, and public relations" },
      // Allied Health Sciences
      { code: "NSC", name: "Nursing Science",                    description: "Nursing practice, healthcare, and patient care" },
      { code: "PHS", name: "Public Health",                      description: "Public health, epidemiology, and health systems" },
    ];

    // Build department lookup by code
    const departments = await db.select().from(DepartmentSchema);
    const deptMap: Record<string, string> = {};
    for (const dept of departments) {
      deptMap[dept.code] = dept.id;
    }
    console.log(`📍 Found ${departments.length} departments`);

    // Check which programs already exist
    const existingPrograms = await db.select({ code: ProgramSchema.code }).from(ProgramSchema);
    const existingCodes = new Set(existingPrograms.map((p) => p.code));

    // Filter to only new programs whose department exists
    const toInsert = programsData.filter((prog) => {
      if (existingCodes.has(prog.code)) {
        console.log(`  ⏭️  Program ${prog.code} already exists, skipping`);
        return false;
      }
      if (!deptMap[prog.code]) {
        console.log(`  ⚠️  No department with code ${prog.code}, skipping`);
        return false;
      }
      return true;
    });

    if (toInsert.length === 0) {
      console.log("\n✅ All programs already exist. Nothing to do.");
      return true;
    }

    const programs = (await db
      .insert(ProgramSchema)
      .values(
        toInsert.map((prog) => ({
          code: prog.code,
          name: prog.name,
          description: prog.description,
          departmentId: deptMap[prog.code],
          universityId: university.id,
        }))
      )
      .returning()) as (typeof ProgramSchema.$inferSelect)[];

    console.log(`\n✅ Created ${programs.length} programs`);
    console.log(`   (${existingCodes.size} already existed, ${programsData.length - toInsert.length - programs.length} skipped)`);

    for (const prog of programs) {
      const dept = departments.find((d) => d.id === prog.departmentId);
      console.log(`     - ${prog.name} → ${dept?.name ?? "?"}`);
    }

    console.log("\n✨ Programs seeding complete!");
    return true;
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    return false;
  }
}

// Run seeding
seedPrograms().then((success) => {
  process.exit(success ? 0 : 1);
});

import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DepartmentSchema, ProgramSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

console.log("🎓 Starting Programs/Majors Seeding...");

async function seedPrograms() {
  try {
    // Programs organized by department
    const programsData = [
      // School of Computing (COMP)
      {
        code: "CS",
        name: "Computer Science",
        description: "Study of computation, algorithms, and software development",
        deptCode: "COMP",
      },
      {
        code: "CYB",
        name: "Cybersecurity",
        description: "Focus on information security and cyber defense",
        deptCode: "COMP",
      },
      {
        code: "DTS",
        name: "Data Science",
        description: "Big data analytics, machine learning, and data visualization",
        deptCode: "COMP",
      },
      {
        code: "SEN",
        name: "Software Engineering",
        description: "Software design, development, and project management",
        deptCode: "COMP",
      },
      {
        code: "ITE",
        name: "Information Technology",
        description: "IT systems, networks, and technology management",
        deptCode: "COMP",
      },
      // School of Management and Social Sciences (MGMT)
      {
        code: "BUA",
        name: "Business Management",
        description: "Business administration, operations, and strategy",
        deptCode: "MGMT",
      },
      {
        code: "ECO",
        name: "Economics",
        description: "Economic theory, analysis, and policy",
        deptCode: "MGMT",
      },
      {
        code: "ACC",
        name: "Accounting",
        description: "Financial accounting, auditing, and taxation",
        deptCode: "MGMT",
      },
      {
        code: "PAD",
        name: "Public Policy and Administration",
        description: "Public administration, governance, and policy analysis",
        deptCode: "MGMT",
      },
      {
        code: "CSS",
        name: "Criminology and Security Studies",
        description: "Criminal justice, law enforcement, and security",
        deptCode: "MGMT",
      },
      // School of Communication and Media Studies (COMM)
      {
        code: "MCM",
        name: "Mass Communication and Media Studies",
        description: "Journalism, broadcasting, advertising, and public relations",
        deptCode: "COMM",
      },
      // School of Allied Health Sciences (HLTH)
      {
        code: "NSC",
        name: "Nursing Science",
        description: "Nursing practice, healthcare, and patient care",
        deptCode: "HLTH",
      },
      {
        code: "PHS",
        name: "Public Health",
        description: "Public health, epidemiology, and health systems",
        deptCode: "HLTH",
      },
    ];

    // Get department IDs
    const departments = await db
      .select()
      .from(DepartmentSchema);

    const deptMap: Record<string, string> = {};
    for (const dept of departments) {
      deptMap[dept.code] = dept.id;
    }

    console.log(`📍 Found ${departments.length} departments`);

    // Insert programs
    const programs = await db
      .insert(ProgramSchema)
      .values(
        programsData.map((prog) => ({
          code: prog.code,
          name: prog.name,
          description: prog.description,
          departmentId: deptMap[prog.deptCode],
        }))
      )
      .returning();

    console.log(`✅ Created ${programs.length} programs/majors`);

    // Group by department for summary
    const progsByDept: Record<string, any[]> = {};
    for (const prog of programs) {
      const dept = departments.find((d) => d.id === prog.departmentId);
      if (dept) {
        if (!progsByDept[dept.name]) {
          progsByDept[dept.name] = [];
        }
        progsByDept[dept.name].push(prog.name);
      }
    }

    console.log("\n📊 Programs by Department:");
    for (const [dept, progs] of Object.entries(progsByDept)) {
      console.log(`   ${dept}:`);
      for (const prog of progs) {
        console.log(`     - ${prog}`);
      }
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

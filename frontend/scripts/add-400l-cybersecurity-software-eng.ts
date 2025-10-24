import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { CourseSchema, DepartmentSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

async function add400LCybersecurityAndSoftwareEngCourses() {
  try {
    console.log("🎓 Adding 400L Cybersecurity and Software Engineering courses...");

    // Get department IDs
    const [cybDept] = await db
      .select()
      .from(DepartmentSchema)
      .where(eq(DepartmentSchema.code, "CYB"));

    const [senDept] = await db
      .select()
      .from(DepartmentSchema)
      .where(eq(DepartmentSchema.code, "SEN"));

    if (!cybDept) {
      console.error("❌ Cybersecurity department not found!");
      return false;
    }

    if (!senDept) {
      console.error("❌ Software Engineering department not found!");
      return false;
    }

    console.log(`📚 Found CYB department: ${cybDept.name} (${cybDept.id})`);
    console.log(`📚 Found SEN department: ${senDept.name} (${senDept.id})`);

    // 400L Cybersecurity courses
    const cyb400LCourses = [
      // 1st Semester
      { courseCode: "CYB401", title: "Research Methodology and Technical Report Writing", level: "400L", semester: "fall" },
      { courseCode: "CYB402", title: "Systems Vulnerability Assessment and Testing", level: "400L", semester: "fall" },
      { courseCode: "CYB403", title: "Project Management", level: "400L", semester: "fall" },
      { courseCode: "CYB404", title: "Final Year Project I", level: "400L", semester: "fall" },
      { courseCode: "CYB405", title: "Cyber Threat Intelligence and Cyber Conflict", level: "400L", semester: "fall" },
      { courseCode: "CYB406", title: "Ethical Hacking and Reverse Engineering", level: "400L", semester: "fall" },
      { courseCode: "CYB407", title: "Information Security and Data Management", level: "400L", semester: "fall" },
      // 2nd Semester
      { courseCode: "CYB408", title: "Ethics and Legal Issues in Cyber Security", level: "400L", semester: "spring" },
      { courseCode: "CYB409", title: "Machine Learning", level: "400L", semester: "spring" },
      { courseCode: "CYB410", title: "Deep and Dark Web Security", level: "400L", semester: "spring" },
      { courseCode: "CYB411", title: "Final Year Project II", level: "400L", semester: "spring" },
      { courseCode: "CYB412", title: "Steganography: Access Methods and Data Hiding", level: "400L", semester: "spring" },
      { courseCode: "CYB413", title: "Cloud Computing Security", level: "400L", semester: "spring" },
    ];

    // 400L Software Engineering courses
    const sen400LCourses = [
      // 1st Semester
      { courseCode: "SEN401", title: "Research Methodology and Technical Report Writing", level: "400L", semester: "fall" },
      { courseCode: "SEN402", title: "Algorithms and Complexity Analysis", level: "400L", semester: "fall" },
      { courseCode: "SEN403", title: "Project Management", level: "400L", semester: "fall" },
      { courseCode: "SEN404", title: "Final Year Project I", level: "400L", semester: "fall" },
      { courseCode: "SEN405", title: "Software Configuration Management and Maintenance", level: "400L", semester: "fall" },
      { courseCode: "SEN406", title: "Software Reverse Engineering and Malware Analysis", level: "400L", semester: "fall" },
      { courseCode: "SEN407", title: "Artificial Intelligence", level: "400L", semester: "fall" },
      // 2nd Semester
      { courseCode: "SEN408", title: "Ethics and Legal Issues in Software Engineering", level: "400L", semester: "spring" },
      { courseCode: "SEN409", title: "Software Architecture and Design", level: "400L", semester: "spring" },
      { courseCode: "SEN410", title: "Human Computer Interaction", level: "400L", semester: "spring" },
      { courseCode: "SEN411", title: "Final Year Project II", level: "400L", semester: "spring" },
      { courseCode: "SEN412", title: "Compiler Construction", level: "400L", semester: "spring" },
      { courseCode: "SEN413", title: "Machine Learning", level: "400L", semester: "spring" },
      { courseCode: "SEN414", title: "Cloud Computing Security", level: "400L", semester: "spring" },
    ];

    // Add Cybersecurity courses
    console.log("\n🔒 Adding Cybersecurity 400L courses...");
    const createdCybCourses = await db
      .insert(CourseSchema)
      .values(
        cyb400LCourses.map((course) => ({
          courseCode: course.courseCode,
          title: course.title,
          credits: 3,
          departmentId: cybDept.id,
          level: course.level,
          semesterOffered: course.semester,
          isActive: true,
        }))
      )
      .returning();

    console.log(`✅ Added ${createdCybCourses.length} 400L Cybersecurity courses`);

    // Add Software Engineering courses
    console.log("\n💻 Adding Software Engineering 400L courses...");
    const createdSenCourses = await db
      .insert(CourseSchema)
      .values(
        sen400LCourses.map((course) => ({
          courseCode: course.courseCode,
          title: course.title,
          credits: 3,
          departmentId: senDept.id,
          level: course.level,
          semesterOffered: course.semester,
          isActive: true,
        }))
      )
      .returning();

    console.log(`✅ Added ${createdSenCourses.length} 400L Software Engineering courses`);

    console.log("\n📋 Added Cybersecurity courses:");
    createdCybCourses.forEach(course => {
      console.log(`   ${course.courseCode} - ${course.title} (${course.semesterOffered})`);
    });

    console.log("\n📋 Added Software Engineering courses:");
    createdSenCourses.forEach(course => {
      console.log(`   ${course.courseCode} - ${course.title} (${course.semesterOffered})`);
    });

    console.log("\n✨ 400L Cybersecurity and Software Engineering courses added successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to add 400L courses:", error);
    return false;
  }
}

add400LCybersecurityAndSoftwareEngCourses().then((success) => {
  process.exit(success ? 0 : 1);
});

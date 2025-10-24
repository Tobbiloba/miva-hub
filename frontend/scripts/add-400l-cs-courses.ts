import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { CourseSchema, DepartmentSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

async function add400LCSCourses() {
  try {
    console.log("🎓 Adding 400L Computer Science courses...");

    // Get the Computer Science department ID
    const [csDept] = await db
      .select()
      .from(DepartmentSchema)
      .where(eq(DepartmentSchema.code, "CS"));

    if (!csDept) {
      console.error("❌ Computer Science department not found!");
      return false;
    }

    console.log(`📚 Found CS department: ${csDept.name} (${csDept.id})`);

    // 400L Computer Science courses
    const cs400LCourses = [
      { courseCode: "CSC401", title: "Research Methodology and Technical Report Writing", level: "400L", semester: "fall" },
      { courseCode: "CSC402", title: "Algorithms and Complexity Analysis", level: "400L", semester: "fall" },
      { courseCode: "CSC403", title: "Project Management", level: "400L", semester: "fall" },
      { courseCode: "CSC404", title: "Distributed Computing", level: "400L", semester: "fall" },
      { courseCode: "CSC405", title: "Organization of Programming Languages", level: "400L", semester: "fall" },
      { courseCode: "CSC406", title: "Final Year Project I", level: "400L", semester: "fall" },
      { courseCode: "CSC407", title: "Ethical and Legal Issues in Computer Science", level: "400L", semester: "spring" },
      { courseCode: "CSC408", title: "Machine Learning", level: "400L", semester: "spring" },
      { courseCode: "CSC409", title: "Human Computer Interaction", level: "400L", semester: "spring" },
      { courseCode: "CSC410", title: "Final Year Project II", level: "400L", semester: "spring" },
      { courseCode: "CSC411", title: "Compiler Construction", level: "400L", semester: "spring" },
      { courseCode: "CSC412", title: "Cloud Computing Security", level: "400L", semester: "spring" },
    ];

    // Add courses to database
    const createdCourses = await db
      .insert(CourseSchema)
      .values(
        cs400LCourses.map((course) => ({
          courseCode: course.courseCode,
          title: course.title,
          credits: 3,
          departmentId: csDept.id,
          level: course.level,
          semesterOffered: course.semester,
          isActive: true,
        }))
      )
      .returning();

    console.log(`✅ Added ${createdCourses.length} 400L Computer Science courses`);
    console.log("\n📋 Added courses:");
    createdCourses.forEach(course => {
      console.log(`   ${course.courseCode} - ${course.title} (${course.semesterOffered})`);
    });

    console.log("\n✨ 400L CS courses added successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to add 400L CS courses:", error);
    return false;
  }
}

add400LCSCourses().then((success) => {
  process.exit(success ? 0 : 1);
});

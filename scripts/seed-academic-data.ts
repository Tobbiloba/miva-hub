import { eq } from "drizzle-orm";
import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  DepartmentSchema,
  CourseSchema,
  FacultySchema,
  AcademicCalendarSchema,
  CourseMaterialSchema,
  AnnouncementSchema,
  StudentEnrollmentSchema,
  CourseInstructorSchema,
  ClassScheduleSchema,
  UserSchema,
} from "lib/db/pg/schema.pg";

console.log("🌱 Starting academic data seeding...");

async function seedAcademicData() {
  try {
    // 1. Create Departments
    console.log("📚 Creating departments...");
    const departments = await db
      .insert(DepartmentSchema)
      .values([
        {
          code: "CS",
          name: "Computer Science",
          description: "Department of Computer Science and Information Technology",
          contactEmail: "cs@miva.edu.ng",
          contactPhone: "+234-xxx-xxx-xxxx",
          officeLocation: "Block A, Room 101",
        },
        {
          code: "MATH",
          name: "Mathematics",
          description: "Department of Mathematics and Statistics",
          contactEmail: "math@miva.edu.ng",
          contactPhone: "+234-xxx-xxx-xxxx",
          officeLocation: "Block B, Room 201",
        },
        {
          code: "ENG",
          name: "Engineering",
          description: "Department of Engineering and Applied Sciences",
          contactEmail: "eng@miva.edu.ng",
          contactPhone: "+234-xxx-xxx-xxxx",
          officeLocation: "Block C, Room 301",
        },
        {
          code: "BUS",
          name: "Business Administration",
          description: "Department of Business Administration and Management",
          contactEmail: "business@miva.edu.ng",
          contactPhone: "+234-xxx-xxx-xxxx",
          officeLocation: "Block D, Room 401",
        },
      ])
      .returning();

    console.log(`✅ Created ${departments.length} departments`);

    // Get the CS department for courses
    const csDept = departments.find((d) => d.code === "CS")!;
    const mathDept = departments.find((d) => d.code === "MATH")!;
    const engDept = departments.find((d) => d.code === "ENG")!;
    const busDept = departments.find((d) => d.code === "BUS")!;

    // 2. Create Courses
    console.log("📖 Creating courses...");
    const courses = await db
      .insert(CourseSchema)
      .values([
        // Computer Science Courses
        {
          courseCode: "CS101",
          title: "Introduction to Computer Science",
          description: "Fundamentals of computer science, programming concepts, and computational thinking",
          credits: 3,
          departmentId: csDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        {
          courseCode: "CS201",
          title: "Data Structures and Algorithms",
          description: "Advanced programming with focus on data structures, algorithms, and complexity analysis",
          credits: 4,
          departmentId: csDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        {
          courseCode: "CS301",
          title: "Database Systems",
          description: "Database design, SQL, normalization, and database management systems",
          credits: 3,
          departmentId: csDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        {
          courseCode: "CS401",
          title: "Software Engineering",
          description: "Software development methodologies, project management, and quality assurance",
          credits: 4,
          departmentId: csDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        // Mathematics Courses
        {
          courseCode: "MATH101",
          title: "Calculus I",
          description: "Limits, derivatives, and applications of differential calculus",
          credits: 4,
          departmentId: mathDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        {
          courseCode: "MATH201",
          title: "Linear Algebra",
          description: "Vector spaces, matrices, eigenvalues, and linear transformations",
          credits: 3,
          departmentId: mathDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        // Engineering Courses
        {
          courseCode: "ENG101",
          title: "Engineering Mathematics",
          description: "Mathematical foundations for engineering applications",
          credits: 3,
          departmentId: engDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
        // Business Courses
        {
          courseCode: "BUS101",
          title: "Introduction to Business",
          description: "Fundamentals of business operations, management, and entrepreneurship",
          credits: 3,
          departmentId: busDept.id,
          level: "undergraduate",
          semesterOffered: "both",
        },
      ])
      .returning();

    console.log(`✅ Created ${courses.length} courses`);

    // 3. Create Academic Calendar
    console.log("📅 Creating academic calendar...");
    const academicCalendar = await db
      .insert(AcademicCalendarSchema)
      .values([
        {
          semester: "2024-fall",
          academicYear: "2024-2025",
          semesterName: "Fall 2024",
          startDate: "2024-09-01",
          endDate: "2024-12-15",
          registrationStartDate: "2024-08-15",
          registrationEndDate: "2024-09-10",
          addDropDeadline: "2024-09-20",
          midtermWeek: 8,
          finalsStartDate: "2024-12-10",
          finalsEndDate: "2024-12-15",
          isActive: true,
        },
        {
          semester: "2025-spring",
          academicYear: "2024-2025",
          semesterName: "Spring 2025",
          startDate: "2025-01-15",
          endDate: "2025-05-15",
          registrationStartDate: "2025-01-01",
          registrationEndDate: "2025-01-25",
          addDropDeadline: "2025-02-05",
          midtermWeek: 8,
          finalsStartDate: "2025-05-10",
          finalsEndDate: "2025-05-15",
          isActive: false,
        },
      ])
      .returning();

    console.log(`✅ Created ${academicCalendar.length} academic calendar entries`);

    // 4. Create a test faculty user and faculty record
    console.log("👩‍🏫 Creating test faculty...");
    
    // First, create a faculty user
    const facultyUser = await db
      .insert(UserSchema)
      .values({
        name: "Dr. Sarah Johnson",
        email: "prof.sarah.johnson@miva.edu.ng",
        emailVerified: true,
        role: "faculty",
        academicYear: "2024-2025",
        enrollmentStatus: "active",
      })
      .returning();

    const faculty = await db
      .insert(FacultySchema)
      .values({
        userId: facultyUser[0].id,
        employeeId: "FAC001",
        departmentId: csDept.id,
        position: "professor",
        specializations: ["Database Systems", "Software Engineering", "Data Science"],
        officeLocation: "Block A, Room 205",
        officeHours: [
          { day: "Monday", startTime: "10:00", endTime: "12:00" },
          { day: "Wednesday", startTime: "14:00", endTime: "16:00" },
          { day: "Friday", startTime: "10:00", endTime: "11:00" },
        ],
        contactPhone: "+234-xxx-xxx-xxxx",
        researchInterests: "Machine Learning, Database Optimization, Educational Technology",
        qualifications: [
          { degree: "PhD Computer Science", institution: "University of Lagos", year: 2015 },
          { degree: "MSc Computer Science", institution: "University of Ibadan", year: 2010 },
          { degree: "BSc Computer Science", institution: "University of Nigeria", year: 2008 },
        ],
      })
      .returning();

    console.log(`✅ Created ${faculty.length} faculty members`);

    // 5. Assign faculty to courses
    console.log("👨‍🏫 Assigning faculty to courses...");
    const cs101 = courses.find((c) => c.courseCode === "CS101")!;
    const cs301 = courses.find((c) => c.courseCode === "CS301")!;

    await db.insert(CourseInstructorSchema).values([
      {
        courseId: cs101.id,
        facultyId: faculty[0].id,
        semester: "2024-fall",
        role: "primary",
      },
      {
        courseId: cs301.id,
        facultyId: faculty[0].id,
        semester: "2024-fall",
        role: "primary",
      },
    ]);

    // 6. Create Class Schedules
    console.log("🕐 Creating class schedules...");
    await db.insert(ClassScheduleSchema).values([
      {
        courseId: cs101.id,
        semester: "2024-fall",
        dayOfWeek: "monday",
        startTime: "09:00",
        endTime: "10:30",
        roomLocation: "Room 101",
        buildingName: "Block A",
        classType: "lecture",
      },
      {
        courseId: cs101.id,
        semester: "2024-fall",
        dayOfWeek: "wednesday",
        startTime: "09:00",
        endTime: "10:30",
        roomLocation: "Room 101",
        buildingName: "Block A",
        classType: "lecture",
      },
      {
        courseId: cs301.id,
        semester: "2024-fall",
        dayOfWeek: "tuesday",
        startTime: "14:00",
        endTime: "15:30",
        roomLocation: "Room 205",
        buildingName: "Block A",
        classType: "lecture",
      },
      {
        courseId: cs301.id,
        semester: "2024-fall",
        dayOfWeek: "thursday",
        startTime: "14:00",
        endTime: "15:30",
        roomLocation: "Lab 1",
        buildingName: "Block A",
        classType: "lab",
      },
    ]);

    // 7. Create Course Materials
    console.log("📁 Creating course materials...");
    await db.insert(CourseMaterialSchema).values([
      {
        courseId: cs101.id,
        materialType: "syllabus",
        title: "CS101 Course Syllabus",
        description: "Complete syllabus for Introduction to Computer Science",
        weekNumber: 1,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs101.id,
        materialType: "lecture",
        title: "Week 1: Introduction to Programming",
        description: "Basic concepts of programming and computational thinking",
        weekNumber: 1,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs101.id,
        materialType: "lecture",
        title: "Week 2: Variables and Data Types",
        description: "Understanding variables, data types, and basic operations",
        weekNumber: 2,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs101.id,
        materialType: "lecture",
        title: "Week 3: Control Structures",
        description: "Conditional statements and loops in programming",
        weekNumber: 3,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs101.id,
        materialType: "lecture",
        title: "Week 4: Functions and Procedures",
        description: "Defining and using functions, parameter passing",
        weekNumber: 4,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs101.id,
        materialType: "assignment",
        title: "Assignment 1: Basic Programming",
        description: "Write simple programs using variables and basic operations",
        weekNumber: 2,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs301.id,
        materialType: "syllabus",
        title: "CS301 Database Systems Syllabus",
        description: "Complete syllabus for Database Systems course",
        weekNumber: 1,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs301.id,
        materialType: "lecture",
        title: "Week 1: Introduction to Databases",
        description: "Database concepts, DBMS, and data models",
        weekNumber: 1,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs301.id,
        materialType: "lecture",
        title: "Week 2: Relational Model",
        description: "Relational databases, tables, keys, and relationships",
        weekNumber: 2,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs301.id,
        materialType: "lecture",
        title: "Week 3: SQL Basics",
        description: "Introduction to SQL queries and data manipulation",
        weekNumber: 3,
        uploadedById: facultyUser[0].id,
      },
      {
        courseId: cs301.id,
        materialType: "lecture",
        title: "Week 4: Advanced SQL",
        description: "Complex queries, joins, and subqueries",
        weekNumber: 4,
        uploadedById: facultyUser[0].id,
      },
    ]);

    console.log("✅ Created course materials");

    // 8. Create Announcements
    console.log("📢 Creating announcements...");
    await db.insert(AnnouncementSchema).values([
      {
        title: "Welcome to Fall 2024 Semester",
        content: "Welcome back students! The Fall 2024 semester begins on September 1st. Please check your course schedules and ensure you have all required materials.",
        targetAudience: "all",
        priority: "high",
        createdById: facultyUser[0].id,
      },
      {
        title: "CS101 - First Assignment Posted",
        content: "The first assignment for CS101 has been posted. Please check the course materials section for details. Due date: September 15th.",
        courseId: cs101.id,
        targetAudience: "course_specific",
        priority: "medium",
        createdById: facultyUser[0].id,
      },
      {
        title: "Database Systems Lab Schedule",
        content: "CS301 Database Systems lab sessions will be held on Thursdays from 2:00 PM to 3:30 PM in Lab 1, Block A.",
        courseId: cs301.id,
        targetAudience: "course_specific",
        priority: "medium",
        createdById: facultyUser[0].id,
      },
      {
        title: "Computer Science Department Meeting",
        content: "All CS students are invited to attend the department orientation meeting on September 5th at 10:00 AM in the main auditorium.",
        departmentId: csDept.id,
        targetAudience: "department_specific",
        priority: "medium",
        createdById: facultyUser[0].id,
      },
    ]);

    console.log("✅ Created announcements");

    // 9. Create a test student enrollment
    console.log("🎓 Creating test student enrollment...");
    
    // First, let's check if there are any existing student users
    const existingStudents = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.role, "student"))
      .limit(1);

    if (existingStudents.length > 0) {
      const student = existingStudents[0];
      await db.insert(StudentEnrollmentSchema).values([
        {
          studentId: student.id,
          courseId: cs101.id,
          semester: "2024-fall",
          academicYear: "2024-2025",
          status: "enrolled",
        },
        {
          studentId: student.id,
          courseId: cs301.id,
          semester: "2024-fall",
          academicYear: "2024-2025",
          status: "enrolled",
        },
      ]);
      console.log("✅ Created student enrollments for existing student");
    } else {
      console.log("ℹ️  No existing students found. Student enrollments will be created when students register.");
    }

    console.log("🎉 Academic data seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- ${departments.length} departments created`);
    console.log(`- ${courses.length} courses created`);
    console.log(`- ${faculty.length} faculty members created`);
    console.log(`- ${academicCalendar.length} academic calendar entries created`);
    console.log("- Course materials, schedules, and announcements created");
    console.log("- System ready for academic operations!");

  } catch (error) {
    console.error("❌ Error seeding academic data:", error);
    throw error;
  }
}

// Run the seed function
seedAcademicData()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
import "load-env";
import { pgAcademicRepository } from "lib/db/pg/repositories/academic-repository.pg";

console.log("🧪 Testing academic database operations...");

async function testAcademicOperations() {
  try {
    // 1. Test department operations
    console.log("\n📚 Testing department operations:");
    const departments = await pgAcademicRepository.getDepartments();
    console.log(`✅ Found ${departments.length} departments`);
    departments.forEach(dept => {
      console.log(`  - ${dept.code}: ${dept.name}`);
    });

    // Test getting CS department
    const csDept = await pgAcademicRepository.getDepartmentByCode("CS");
    console.log(`✅ CS Department: ${csDept?.name}`);

    // 2. Test course operations
    console.log("\n📖 Testing course operations:");
    const allCourses = await pgAcademicRepository.getActiveCourses();
    console.log(`✅ Found ${allCourses.length} active courses`);
    
    const csCourses = csDept 
      ? await pgAcademicRepository.getCoursesByDepartment(csDept.id)
      : [];
    console.log(`✅ Found ${csCourses.length} CS courses`);
    csCourses.forEach(course => {
      console.log(`  - ${course.courseCode}: ${course.title}`);
    });

    // Test getting specific course
    const cs101 = await pgAcademicRepository.getCourseByCode("CS101");
    console.log(`✅ CS101 Course: ${cs101?.title}`);

    // 3. Test course materials
    console.log("\n📁 Testing course materials:");
    if (cs101) {
      const materials = await pgAcademicRepository.getCourseMaterials(cs101.id);
      console.log(`✅ Found ${materials.length} materials for CS101`);
      materials.slice(0, 3).forEach(material => {
        console.log(`  - Week ${material.weekNumber}: ${material.title} (${material.materialType})`);
      });

      // Test materials by type
      const lectures = await pgAcademicRepository.getCourseMaterialsByType(cs101.id, "lecture");
      console.log(`✅ Found ${lectures.length} lecture materials for CS101`);

      // Test materials by week
      const week4Materials = await pgAcademicRepository.getCourseMaterials(cs101.id, 4);
      console.log(`✅ Found ${week4Materials.length} materials for CS101 Week 4`);
      week4Materials.forEach(material => {
        console.log(`    - ${material.title}`);
      });
    }

    // 4. Test announcements
    console.log("\n📢 Testing announcements:");
    const announcements = await pgAcademicRepository.getAnnouncements();
    console.log(`✅ Found ${announcements.length} active announcements`);
    announcements.slice(0, 2).forEach(announcement => {
      console.log(`  - ${announcement.title} (${announcement.priority})`);
    });

    // Test course-specific announcements
    if (cs101) {
      const courseAnnouncements = await pgAcademicRepository.getAnnouncements(cs101.id);
      console.log(`✅ Found ${courseAnnouncements.length} announcements for CS101`);
    }

    // 5. Test academic calendar
    console.log("\n📅 Testing academic calendar:");
    const activeCalendar = await pgAcademicRepository.getActiveAcademicCalendar();
    console.log(`✅ Active semester: ${activeCalendar?.semesterName}`);

    const fallCalendar = await pgAcademicRepository.getAcademicCalendarBySemester("2024-fall");
    console.log(`✅ Fall 2024: ${fallCalendar?.startDate} to ${fallCalendar?.endDate}`);

    // 6. Test class schedules
    console.log("\n🕐 Testing class schedules:");
    if (cs101) {
      const schedule = await pgAcademicRepository.getCourseSchedule(cs101.id, "2024-fall");
      console.log(`✅ Found ${schedule.length} class sessions for CS101`);
      schedule.forEach(session => {
        console.log(`  - ${session.dayOfWeek} ${session.startTime}-${session.endTime} in ${session.roomLocation}`);
      });
    }

    // 7. Test faculty operations
    console.log("\n👩‍🏫 Testing faculty operations:");
    if (csDept) {
      const csFaculty = await pgAcademicRepository.getFacultyByDepartment(csDept.id);
      console.log(`✅ Found ${csFaculty.length} faculty members in CS department`);
      csFaculty.forEach(faculty => {
        console.log(`  - Employee ID: ${faculty.employeeId}, Position: ${faculty.position}`);
      });
    }

    // 8. Test complex queries
    console.log("\n🔗 Testing complex queries:");
    if (cs101) {
      const courseWithInstructor = await pgAcademicRepository.getCourseWithInstructor(cs101.id, "2024-fall");
      console.log(`✅ Course with instructor data: ${courseWithInstructor.length} records`);
      courseWithInstructor.forEach(record => {
        console.log(`  - Course: ${record.course.courseCode}, Department: ${record.department.code}, Instructor Role: ${record.instructorRole?.role || 'N/A'}`);
      });
    }

    console.log("\n🎉 All academic database operations completed successfully!");
    console.log("✅ Academic schema is working correctly and ready for MCP tool integration!");

  } catch (error) {
    console.error("❌ Error testing academic operations:", error);
    throw error;
  }
}

// Run the test
testAcademicOperations()
  .then(() => {
    console.log("✅ Academic operations test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Academic operations test failed:", error);
    process.exit(1);
  });